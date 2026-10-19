# V Track Final Plan Implementation Plan: one whole-number rule, the label print queue's gates, a live field read once, and the form-error rule in the design docs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **NOT REHEARSED. Stop on any mismatch.** This plan had no dry run (the user agreed, 2026-10-19). Every exact old text, line number, failure and count below was taken by reading `master` at `71a9e95c`. An implementer who finds an old text that does not occur exactly once at its turn, a Step 2 that fails differently from what it states, a "fails after Step 3" list that differs, a count that differs, or a guard that fails without a listed edit **stops and reports to the controller before changing anything else**. Never adapt an edit to make it fit. (Drafting check, not a rehearsal: a read-only script confirmed that every exact old text below occurs exactly once in its file at its turn. The drafter also applied the edits by script in a throw-away copy of `71a9e95c` (from `git archive`, outside the repo, since deleted) and ran the test suite there after each step, `tsc` and a lint of the touched files: each Step 2 failed with the message it names, each "fails after Step 3" list was exactly as written, and the totals were 2306, 2307, 2308, 2309 and 2310 with 0 fail. That copy was not the CRLF working tree, no implementer replayed this text, and no build, full lint or app run was done: Task 5 is the first. The final review then parsed this plan's own text (not the drafting lists), applied every Step 1 block and every exact edit in order to a fresh CRLF copy of `71a9e95c` and ran the suite after each step: every old text occurred once, each Step 2 failed with the message it names, each "fails after Step 3" list matched, the totals were 2306 to 2310 with 0 fail, every `eol.mjs` number matched, and `tsc --noEmit` and an eslint run of the touched files were clean. Still not a replay by an implementer, and still no build or app run.)

**Goal:** the final plan of the V track, "errors under the field" (`docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md`, the user's decisions U1–U9), on plans 1–3 as merged at `master` `71a9e95c`. After it:
- one shared whole-number rule, `wholeNumber` in `src/lib/validation-rules.ts`, with its own sentence "กรุณากรอกเป็นจำนวนเต็ม" (`common.validation.notWholeNumber`), replaces the three ways the forms restate a whole number today (plan 2 P-R8 and open issue 12; plan 3 open issue 2): the license seats' `pattern(String(v), /\d+/)`, the audit round's own `wholeNumber` helper, and `step(v, 1)` in the PM days and three settings rules (Task 1);
- the label print queue's three gates (plan 2 open issue 16) stay focusable: "พิมพ์ป้ายที่เลือก" and "พิมพ์ทดสอบ 1 ดวง" with nothing selected, and "เพิ่มตามตัวกรอง" with nothing in the scope, are `aria-disabled`, tied by `aria-describedby` to the visible line that says why, and their handlers return first (Task 2);
- a field with a check that runs while typing reads a save's or the server's error once (plan 3 open issue 14): `Field liveError` takes the live check's own text instead of a flag, so its polite region holds only what the live check finds, for every such field at once (the asset form's tag and serial, the batch's row fields, the 15 live settings and nine label fields, the depreciation JSON, the prefix editor) (Task 3);
- the form-error rule is written into `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md` and `.impeccable/design.json` (spec §9 item 4), and the doc and guard text that still says otherwise is brought in line (Task 4).

No migration, no database write, no schema change, no new dependency, no server change (`src/lib/field-errors.ts` and every route stay as they are). One new message key. No guard row is added or changed.

**Architecture:**
- **Four code tasks**, each one commit with its test and every pin it changes; the tree is green after every commit:
  - **Task 1 (VF1)** the whole-number rule (`validation-rules.ts`, four forms and rule files, one message);
  - **Task 2 (VF2)** the print queue's three gates (`asset-label-batch-tool.tsx`);
  - **Task 3 (VF3)** `Field liveError` carries the live text (`field.tsx` and its five callers);
  - **Task 4 (VF4)** the docs and the guard comments (`DESIGN.md`, docs/14, `.impeccable/design.json`, three test files' comments). It comes last among the code tasks so the docs describe Tasks 1–3 as built.
- **Hard dependencies:** Tasks 1–4 append to one new test file in order. Task 4's text names `wholeNumber`, `notWholeNumber` and the new `liveError`, so it follows Tasks 1 and 3. Tasks 1, 2 and 3 touch no common line (Tasks 1 and 3 both edit `asset-form.tsx`, at lines 36 and 292–293 and at lines 1025 and 1082; both edit `tests/v-track2-a.test.ts` and `tests/v-track3.test.ts` at different lines).
- **Task ids:** "VF1"…"VF4" in test names and commit messages ("(v-track final task 1, VF1)"). Rulings of this plan are `VF-R1`…`VF-R9`; a bare `ST-R*` is plan 3's, `S-R*`, `F-R*`, `M-R*` plan 1's, `A-R*`, `U-R*`, `MT-R*`, `P-R*`, `X-R*` plan 2's.
- **Branch:** `feat/v-track-final` from `master` at `71a9e95c`, in the main checkout `D:/Antigravity/asset-system`. No worktree.
- **Tests:** one new LF test file, `tests/v-track-final.test.ts`, one test per code task (Task 1 creates it, Tasks 2–4 append). Task 6 appends one test to `tests/v-track-docs.test.ts`.
- **Controller tasks:** Task 0 (branch, baseline, counts, before evidence), Task 5 (verify, production build, dev-app check), Task 7 (final verification, wiki, memory, merge only with the user). Task 6 (the handoff and the changelog) is an implementer task; it stops if Task 5's findings file is missing. In Tasks 0 and 5 **no request but a GET reaches the server**: the settings save (`PUT /api/admin/settings`) is always fulfilled with a stand-in, every other non-GET is aborted.

**Tech Stack:** Next.js 16.4 App Router · React 19 · Tailwind CSS 4 · next-intl 4 · zod 4.4.1 · Prisma 7 (not changed) · `node --test` with Node 24 type stripping (strip-only: no parameter properties, no enums in modules tests import). No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` (approved by the user, 2026-10-17). **Foundation contract:** plans 1–3 of the track, merged at `71a9e95c`: `docs/superpowers/plans/2026-10-17-v-track-plan1.md`, `docs/superpowers/plans/2026-10-18-v-track-plan2.md` and `docs/superpowers/plans/2026-10-19-v-track-plan3.md`: their Global Constraints, FIXED INTERFACES 1–12 as amended, and rulings (plan 1 S-R1–S-R13, F-R1–F-R10, M-R1–M-R14; plan 2 R1–R8 with A-R*, O-R*, U-R*, D-R*, MT-R*, P-R1–P-R10, X-R1–X-R5; plan 3 ST-R1–ST-R11) bind every task here. The code they shipped is what this plan builds on: `src/lib/validation-rules.ts` (`range`, `step`, `decimals`, `RuleCode`), `src/lib/field-error-client.ts` (`common.validation.<code>` first), `src/components/ui/field.tsx` (`liveError`, `FieldError` without an alert role), `src/components/ui/use-field-errors.ts`, `src/lib/system-settings-field-rules.ts` (`settingControlCode`), `tests/validation-guards.test.ts` (`V_SCOPE` = `V_FORMS`, 44 files; `NON_VALIDATION_TOASTS`, 5 rows).
- **What this plan covers:** spec §9 item 4 (the docs), the user's approved scope of 2026-10-19 (items 1–4 above), plan 2 open issues 12 (the shared whole-number rule) and 16 (the print queue's gates), plan 3 open issues 2 (a clearer whole-number sentence) and 14 (a live field read once). "Spec coverage" near the end maps each spec section to its task.
- **Left to the builder (§10), decided here:** how `Field` avoids a second reading (VF-R4), the whole-number sentence (VF-R2), where the rule sits in each doc (VF-R5).
- **Line numbers** are of `71a9e95c` in every "Changes" table. A task that edits a file an earlier task of this plan edited finds its site by the quoted text; every exact old text below occurs once in its file at the moment its task applies it (checked by the drafting script).

`c/` = `src/components/` · `D/` = `src/app/[locale]/(dashboard)/` · `<temp>` = `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/v4-plan` (the controller hands the path to every implementer; message change files go to `<temp>/changes/`) · `<tools>` = `<temp>/tools` (`eol.mjs` prints, per file, its CRLF count and its line count; `counts.mts` prints the track's counts; both read-only, run with the repo root as the working directory).

**Base:** `master` at `71a9e95c` (V track plans 1–3 merged; phase 2D and Dark Mode merged; nothing deployed).

## Global Constraints

- **Git:**
  - Work in the main checkout `D:/Antigravity/asset-system` on branch `feat/v-track-final`, which holds `71a9e95c` and this plan's commit (`docs/superpowers/plans/2026-10-19-v-track-final.md`).
  - Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase` or `git clean`, never touch `master`, never push. (A branch switch or a stash rewrites working-tree line endings: plans 2 and 3 saw it.)
  - Commit only the files your task names. Use `git add <paths>` (quote paths with brackets or parentheses) and never a bare `git add -A` or `git add .`.
  - The checkout has untracked folders and files that are not yours: `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/` and `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`; another session may add `.claude/` while its preview server runs. Leave them alone.
  - End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (each Step 6 passes it as a second `-m`).
- **Next.js 16.4** is not the Next.js in your training data. This plan uses no Next behaviour beyond plans 1–3's and changes no route; read `node_modules/next/dist/docs/` before relying on any Next API.
- **Repo facts:** React 19; Tailwind 4; next-intl 4; zod 4.4.1; Prisma 7; `npm test` runs `node scripts/run-tests.mjs` over `tests/**/*.test.{ts,mjs,js}`; tests import `.ts` with relative imports and read `.tsx` as text; `tests/helpers/source-files.ts` (`readSourceFiles`, `findMatches`, `countMatchesByFile`) reads `src` with LF endings; `tsconfig.json` includes `**/*.ts`, so tests are type-checked.
- **Line endings** (`git ls-files --eol` in the real checkout at `71a9e95c`; `git config core.autocrlf` is `true`):
  - **CRLF (`i/lf w/crlf`)**: every existing file this plan edits, 29 in all (lines at `71a9e95c`): `src/lib/validation-rules.ts` (93), `src/lib/system-settings-field-rules.ts` (186), `c/assets/asset-form.tsx` (2076), `c/audit/audit-round-form.tsx` (395), `c/maintenance/maintenance-plan-form.tsx` (230), `c/assets/asset-label-batch-tool.tsx` (754), `c/ui/field.tsx` (109), `c/assets/asset-batch-form.tsx` (1344), `c/admin/system-settings-form.tsx` (2640), `c/admin/depreciation-policy-builder.tsx` (448), `messages/th.json` and `messages/en.json` (4265 each), `DESIGN.md` (660), `docs/14_UI_UX_DESIGN_SYSTEM.md` (142), `.impeccable/design.json` (593), `DEVELOPER_HANDOFF.md` (1166), `docs/99_CHANGELOG.md` (1963), and the tests `tests/v-track-f.test.ts` (248), `tests/v-track2-a.test.ts` (311), `tests/v-track2-u.test.ts` (219), `tests/v-track2-m.test.ts` (294), `tests/v-track2-x.test.ts` (215), `tests/v-track3.test.ts` (368), `tests/asset-label-print-ui.test.ts` (223), `tests/asset-forms-ui.test.ts` (139), `tests/form-migration-guards.test.ts` (503), `tests/asset-status-correction-ui.test.ts` (21), `tests/validation-guards.test.ts` (226), `tests/v-track-docs.test.ts` (86).
  - **New and LF:** `tests/v-track-final.test.ts` (Task 1, appended by Tasks 2–4).
  - No mixed file is edited.
  - Before you edit a file, run `git ls-files --eol <file>` and keep what it shows. In Git Bash, `grep -c $'\r'` reports 0 even for CRLF files: do not use it as a check. `git add` of an LF working-tree file prints "LF will be replaced by CRLF the next time Git touches it": expected and harmless; do not renormalize.
  - Keep each file's line endings: edit with exact-string replacement (the Edit tool keeps them), never a formatter, never `sed -i` (it writes LF in Git Bash). Write the new test file and appended test blocks with a file tool, never a shell heredoc or `node -e` (both lost a backslash in plan 3's drafting).
  - **Never write a test that asserts working-tree line endings.** Tests that read source files strip `\r` before multi-line regexes.
  - Check line endings with `node <tools>/eol.mjs <file>…`: a CRLF file prints the same number twice; an LF file prints 0 and then its line count. Each Step 5 lists the numbers the edits give (computed from the edits, not measured).
- **How to read a task** (as in plans 1–3):
  - **Changes at 71a9e95c** is a table of the sites: the line, what is there now, what it becomes, and the rule. The exact edits that follow it are the text to apply: in order, each old text occurs once in the file at that moment. Where a row and an exact edit differ, the exact edit wins.
  - **Step 1 code blocks are exact:** create or append them byte for byte. "Append" adds the block at the end of the file; the first line of a block shown empty is the blank line before it.
  - **Pin edits** are exact old → new strings; each old string occurs once in its file.
  - **A comment a row adds is source the tests read.** It must not contain a string a test forbids: in Tasks 1–3 never write `step(` followed by `, 1)`, a word `liveError` followed by a space or `>`, or `function wholeNumber(` outside `validation-rules.ts`.
  - **Counts.** Each task's `npm test` numbers are the full totals after the task (below). A total that differs means stop and report, with the task's own delta (+1 for every task but Tasks 0, 5 and 7).
- **Counts on this plan's chain** (tests / pass / fail / skipped): base 2305 / 2304 / 0 / 1 (`DEVELOPER_HANDOFF.md:1139`, plan 3's verify) · Task 1 2306 · Task 2 2307 · Task 3 2308 · Task 4 2309 · Task 6 2310 (pass one fewer, 0 fail, 1 skipped). Messages (leaf keys per locale): 4083 · Task 1: 4084. Unchanged throughout: `V_FORMS` 44 (= `V_SCOPE`); `<form … noValidate>` in `src` 47; toasts outside a catch in `src` 23 in 11 files; `NON_VALIDATION_TOASTS` 5 rows; `SELECT_STAR_ONLY` `0 in 0`; FMG `STAR_ONLY` `new Set<string>([])`.
- **Tests:**
  - Run one file with `node --test tests/<file>.test.ts`.
  - Tests cannot import `.tsx`; they read it as text. A plain import of a type name fails under type stripping: use inline `type` specifiers.
  - **No test imports a test file.** `tests/v-track-final.test.ts` declares `read`, `messages` and `C` once, in Task 1's block; later blocks use them and declare nothing at the top level.
- **Baseline at `71a9e95c`** (Task 0 checks it again): `npm test` 2305 tests, 2304 pass, 0 fail, 1 skipped; `npx tsc --noEmit` clean; `npm run lint` 0 errors and the warnings plan 3 recorded (146, all under `.agents/`; Task 0 records the real number and every task compares with it).
- **Every task ends with all of these green:** `npm test` with 0 fail and the task's count; `npx tsc --noEmit`; `npm run lint` with 0 errors and no new warning in `src/` or `tests/`. Report any failure by name.
- **Messages:** only through `node scripts/messages-edit.mjs <change file>`, with the change file saved in `<temp>/changes/`, and only this key: Task 1 adds `common.validation.notWholeNumber` (th "กรุณากรอกเป็นจำนวนเต็ม", en "Enter a whole number"). Words follow `docs/19_THAI_GLOSSARY.md`; `tests/thai-glossary.test.ts`, `tests/messages-parity.test.ts` and `tests/messages-edit.test.ts` stay green. If you think another key is missing, stop and report.
- **The form convention** (plans 1–3): `noValidate` directly after `onSubmit`; the HTML constraint attributes stay (`step`, `min`, `max`, `required`); `validate()` restates them through `src/lib/validation-rules.ts`; never `role="alert"` or `aria-live="assertive"` on a field error (F-R6); never `aria-invalid` on a `<button>` (F-R7). Prerequisite gates: `aria-disabled` plus `aria-describedby` to a visible reason, the handler returns first (M-R10).
- **Guards:** `tests/form-migration-guards.test.ts` (FMG), `tests/visual-foundation-guards.test.ts`, `tests/list-frame-guards.test.ts`, `tests/ui-overlay-guards.test.ts`, `tests/validation-guards.test.ts` (V1–V5). This plan adds and changes no guard row (Task 4 edits only comments in FMG and the V guards). If a change would make a guard fail and the task does not list that edit, stop and report.
- **The server:** no change. `src/lib/field-errors.ts` (zod's `.int()` reads `invalidNumber`, X-R2), every route and every schema stay byte for byte. Integration v1 does not change.
- **Off limits:**
  - Never open, read or print `.env` or `.env.prod-admin`.
  - Implementers do not run `npm ci`, `npm install`, `npm run build`, the dev server, or anything against a database. The controller runs the app in Tasks 0 and 5 and writes nothing to the database there.
  - Do not run skill helper scripts; they make network calls. The scripts in `<tools>` are read-only and run with the repo root as the working directory.
  - Keep helper scripts and change files in `<temp>`, outside the repo.
  - In Git Bash, MSYS rewrites a command-line argument that looks like a path: set `MSYS_NO_PATHCONV=1` for such a call. The Edit tool does not have this problem.
- **Deploy:** none. One deploy after Dark Mode, the whole V track and the E2E suite (wiki item 27).
- **Executors** are Opus-medium subagents that see only their task brief and these Global Constraints; the controller reviews every task before the next starts.

## Rulings of this plan

- **VF-R1, the earlier rulings apply.** Plans 1–3's rulings and FIXED INTERFACES as amended; spec 2C K4, K5 a, K6 a; Dark Mode's two-theme rule (every class this plan adds is already in use: `mt-1 text-meta text-muted-foreground`, the shared `Button` and `EmptyNote`). Where an earlier ruling and this list differ, this list says so and why.

- **VF-R2, one whole-number rule (Task 1; spec §4.5, §7.2; plan 2 P-R8, X-R2; plan 3 open issue 2).**
  - `wholeNumber(value)` in `src/lib/validation-rules.ts`: an empty value → `null` (left to `required`), text that is not a finite number → `"invalidNumber"`, a fraction → `"notWholeNumber"`, else `null`. It reads the number as `range` does (`Number(value.trim())`), so it accepts what the browser's step of 1 accepted before `noValidate` (`1.0`, `1e3`, `+5`, `-3`) and refuses what it refused.
  - `"notWholeNumber"` is a `RuleCode` beside `"tooManyDecimals"` (X-R3's model), not a `FieldErrorCode`: the server never sends it. Its message `common.validation.notWholeNumber` is "กรุณากรอกเป็นจำนวนเต็ม" (en "Enter a whole number"), worded like `invalidNumber` ("กรุณากรอกเป็นตัวเลข") and like the catalog's "ต้องเป็นจำนวนเต็ม" sentences. Every form already reads `common.validation.<code>` first (`resolveValidationMessage`; the settings form's `validationMessage(code, settingControlParams[key])`, the asset form's `errorText` → `fieldErrors.message`), so no form needs wiring.
  - It replaces every restatement: the license seats (`asset-form.tsx:292–293`, `pattern(String(v), /\d+/)` → `invalidFormat` "รูปแบบไม่ถูกต้อง"), the audit round's year and sample rate (`audit-round-form.tsx:71–75`, a local `wholeNumber` → `invalidNumber`; the call sites keep their text and now call the shared one), the PM days (`maintenance-plan-form.tsx:48`, `step(v, 1)`), and three settings rules (`system-settings-field-rules.ts:110–112`, `step(value, 1)`: the asset tag's running digits, the LDAP deactivation limit, the document running digits and each label's width, height and QR size). After Task 1 no `step(…, 1)` is left in `src` (Task 1's test).
  - `step` stays for the label margin and gap (`step(value, 0.5)`, `invalidNumber`; open issue 2). Not restatements and not touched: `notWhole()` and `outside()` in `system-settings-field-rules.ts` (they mirror the server's own rules with catalog codes, ST-R2), the private `wholeNumber` of `src/lib/list-pagination.ts` (page parameters), the server parsers, and the depreciation builder's month inputs (sanitised on change, no `validate()`).
  - The server's `.int()` keeps reading `invalidNumber` (`src/lib/field-errors.ts:57–58`, X-R2): no form sends a fraction any more, so only a request that skips the form meets it (open issue 1).

- **VF-R3, the print queue's three gates (Task 2; spec §4.4, §11 call 2; plan 2 open issue 16).**
  - The page is not a form of the scope list (it searches and queues; printing opens the print page), so it gets no `noValidate` and no `V_SCOPE` row; its three buttons are prerequisite gates in the sense of §4.4 ("nothing selected", "no items in this scope").
  - Print and print one test label: `aria-disabled={selectedForPrint.length === 0 || undefined}` and `aria-describedby` to the empty note already under them, which takes the id `asset-label-print-reason` ("ยังไม่ได้เลือกทรัพย์สิน", `assetTools.noSelectedLabels`; no new message). Their handlers already return first (`printLabels` on an empty list, `printFirstLabel` without a first asset).
  - Add filtered: the button keeps one label, "เพิ่มตามตัวกรอง" (`labels.addFilteredQueue`), instead of swapping it for the reason; the reason "ไม่มีรายการในขอบเขตนี้" (`labels.addFilteredQueueUnavailable`, an existing message) shows as a line under the scope summary beside the button, `<p id="asset-label-add-filtered-reason" className="mt-1 text-meta text-muted-foreground">` (the class of the scope help line above it), only while the gate holds. `addRecentAssets` gains `if (recentAssets.length === 0) return` (Enter and Space still reach an `aria-disabled` button; `aria-disabled:pointer-events-none` stops only the mouse).
  - The gate's conditions stay as they are (open issues 4 and 5).

- **VF-R4, a live field is read once (Task 3; spec §7.3, G5, U8; plan 3 open issue 14).**
  - `Field`'s `liveError` changes from a flag to the live check's own text: `liveError?: string | null`. A field with a check that runs while typing always passes it (`null` while the check finds nothing), so its polite region (`data-slot="field-error-live"`, `sr-only`, `aria-live="polite"`) is in the DOM from the first render and reads each new text once. The region renders `{liveError}`, never `{error}`: an error that a save or the server set shows under the field (`error`) and is read once, through focus and `aria-describedby` (F-R6). A field that passes no `liveError` (`undefined`) has no region, as today.
  - The visible error line is `aria-hidden` only while the region holds the same text (`(liveError && liveError === error) || undefined`), so a save's error is also in the reading order of the page, and a live error is not read twice in browse mode. Every caller's `error` shows the live text first, so the two are the same string while the live check fails.
  - The callers pass only their live part: the asset form `duplicateState.assetTagExists ? t("duplicateAssetTag") : null` (and the serial's), the batch a new `rowLiveError(index, field)` (the live duplicate only), the settings form a new `settingLiveError(key)` (only `liveErrors`, the code `settingLiveErrors` finds) for its 15 live fields, `liveErrorFor={settingLiveError}` for each tape's nine label fields and `jsonLiveError` for the depreciation JSON, and the prefix editor `prefixLiveCode ? labels.invalidPrefix : null`. `error` stays as it is everywhere (`settingError`, `rowError`, `errorText`, `prefixEditorError` keep the live text first).
  - Why not a change in `Field` alone or in the hook (recon options B and C): `Field` cannot tell who set its error (a save by Enter inside the field and a late duplicate check would both be misread), and the hook does not know which errors are live; every caller already computes its live part.
  - A live error that a save then focuses is read by the region while typing and again by focus on the save: one reading per event, as plan 3 accepted.

- **VF-R5, where the rule is written (Task 4; spec §9 item 4; recon A §5).**
  - `DESIGN.md`: a new `### Forms: Errors Under the Field` in §5, after `### Forms: Save Bar, Steps, Sections and Signature` and before `### Navigation`, opening with **The Error Under the Field Rule.** and holding: `noValidate` and `validate()`, errors under the field after save (a live check's too, never in a box of its own), focus on the first wrong field with `reveal`, the server's `fieldErrors`, messages, no validation toast, prerequisite gates with a visible reason, one announcement per save (`Field liveError` as Task 3 left it), both themes. The sentences elsewhere that the V track made untrue are rewritten: the overview (one sentence added), the Thai Copy Rule (the 400 body now carries `fieldErrors`), the button's Disabled and Busy bullets, the dialog's Errors bullet, the `SearchableSelect` bullet, the toast bullet, the live-region roles, the `Field` bullet (no alert role, why the native attributes stay, `STAR_ONLY` empty, every form has its errors under its fields), the groups bullet (`FieldGroup`), the scan check's save; one Do and one Don't.
  - `docs/14`: the Button, `Field`, group, `SearchableSelect`, toast and dialog rows; a row "A form's errors"; a paragraph on `tests/validation-guards.test.ts` after the guard paragraph; a registry row "Form errors" for the V track spec and its four plans (the 2C row points at it); a QA line.
  - `.impeccable/design.json`: the gate in the Primary Button, an error line in the Text Field's example (html and css; only the Text Field may hold `40px`, phase2d-docs), the dialog's field errors, one Do and one Don't; `generatedAt` 2026-10-19. **No narrative rule:** the impeccable schema allows `colors`, `typography` and `elevation` sections only (`reference/document.md`), and a rule may not go between The Token Contrast Rule and The Two-Theme Rule (dark-mode-docs).
  - The pinned phrases of `tests/phase2d-docs.test.ts` and `tests/dark-mode-docs.test.ts` stay (the Button bullet keeps "no `disabled:opacity-*` in `src`", the docs/14 Button row keeps its tail "never a height of its own at `sm:` and never `disabled:opacity-*`", `dos[0]` stays first, the two pinned Don'ts stay).
  - Guard and pin comments that still say the V track is to come: `tests/form-migration-guards.test.ts:23`, `:51–52`, `:234`; `tests/asset-status-correction-ui.test.ts:19`; `tests/validation-guards.test.ts:9–10`. Comments only; no assertion changes.

- **VF-R6, the tests.** One new LF file, `tests/v-track-final.test.ts`: Task 1 creates it with its imports and `read`, `messages`, `C`; Tasks 2–4 append one test each (source tests, as every V test of a `.tsx`). Task 6 appends the record test to `tests/v-track-docs.test.ts` and moves plan 3's "first under the newest date" assertion (P1), as plan 3's Task 8 moved plan 2's.

- **VF-R7, what does not change.** The server and `src/lib/field-errors.ts`; `use-field-errors.ts`, `field-focus.ts` (`waitForDialogToClose`, open issue 7), `field-group.tsx`, `searchable-select.tsx`; every guard list (`V_SCOPE`, `V_FORMS`, `NON_VALIDATION_TOASTS`, `EXEMPT`, `OWNERS`, `CONSTRAINT_FLOORS`, `STAR_ONLY`); the prefix editor's transfer arrows (open issue 6); the audit scan's server-refusal toasts (open issue 8); the print queue's list rows and its "load more" and "reset filters" buttons (not gates).

- **VF-R8, nothing is written during the checks (Tasks 0 and 5).** Plan 3's handler, unchanged (Task 0 Step 6): `GET` and `HEAD` continue, `PUT /api/admin/settings` is always fulfilled with a stand-in, every other non-GET is aborted; two probes prove it before any form opens; the login's own POST is the one request that writes (the seed admin's `lastLoginAt` in the dev database, as in plans 1–3). The print queue's print opens the print page with a GET: allowed, never pressed with an empty list.

- **VF-R9, not rehearsed.** The user agreed to no dry run (2026-10-19). Every old text, failure and count is read from `71a9e95c`; the drafting check of the header confirmed them in a scratch copy, which is not a replay by an implementer. An implementer stops on the first mismatch; the controller decides whether the plan text or the code is wrong and amends the plan before the task goes on. Task 5's dev-app check is the first time the changes run in React.

## Review Focus

Five failure modes that would bite a person. 1–4 are held by assertions in their task's Step 1 block or a pin; Task 5 checks them on the app. 5 cannot be held by a test: Task 0 Step 6's handler, its two probes and the end count hold it, and Task 6 refuses to write the check without Task 5's findings.

1. **A whole-number field accepts a fraction, or refuses a value it took before (Task 1).** `wholeNumber` must refuse 1.5 and 2569.5 and accept 0, 2026, 1.0 and 1e3, and each of its eight sites must call it after its range (for the label sizes and the document running digits the server's own rule, `settingRuleCode`, already checks the range, so it stands alone there). **Tests:** Task 1's block runs `wholeNumber` on those values, checks each site's exact `check(…)` or `if (key …)` line and its import, and finds no `step(…, 1)` left in `src`; plan 3's ST1 test keeps comparing the settings rules with the server's schema (the codes move from `invalidNumber` to `notWholeNumber` for the whole-number settings only, not the margin and gap). Task 5: a seat count, a round year, a PM interval and a label width of x.5 each show "กรุณากรอกเป็นจำนวนเต็ม" under the field and send nothing.
2. **A print queue gate that blocks the keyboard or hides its reason (Task 2).** **Tests:** Task 2 pins the three `aria-disabled` / `aria-describedby` pairs, the reasons' ids on visible elements, the handlers' early returns and that no plain `disabled` gate is left. Task 5: each button is reachable with Tab, looks disabled, is described by its reason; Enter sends nothing and adds nothing.
3. **A live check no longer announced, or a save's error still read twice (Task 3).** The region must be in the DOM before the first live error (a polite region inserted with its text is often not read), and must stay empty for a save's error. **Tests:** Task 3 pins the region (`liveError !== undefined`, `{liveError}`), the `aria-hidden` rule, every caller's live text (32 `liveError={…}` sites in four files, none without a value), and the settings form's 15 live sites naming the same key twice. Task 5: the accessibility tree and the region's text for a typed bad value (region holds it), a save's error (region empty, the focused field's description holds it) and a stand-in server refusal (region empty), at 1440 and 375.
4. **The docs contradict the code or break a pinned phrase (Task 4).** **Tests:** Task 4's block checks the new section and its phrases, that the untrue clauses are gone, the docs/14 rows, registry row and QA line, the design.json entries and its three narrative sections; `tests/phase2d-docs.test.ts` and `tests/dark-mode-docs.test.ts` stay green (Task 4 Step 5 runs them). The controller reads the section against the code of Tasks 1–3 in review.
5. **A non-GET reaches the server during the checks (Tasks 0, 5).** **Rule:** VF-R8, Task 0 Step 6's handler and probes, the end count; every page of the checks opens in the routed Playwright context, never in the Browser pane `preview_start` opens.

## File structure

| File (line endings) | What changes | Task |
|---|---|---|
| `src/lib/validation-rules.ts` (CRLF) | `wholeNumber`; `RuleCode` gains `"notWholeNumber"`; `step`'s comment | 1 |
| `c/assets/asset-form.tsx` (CRLF) | the seats' rule and the import (1); the tag's and serial's `liveError` text (3) | 1, 3 |
| `c/audit/audit-round-form.tsx` (CRLF) | its own `wholeNumber` goes; the shared one is imported | 1 |
| `c/maintenance/maintenance-plan-form.tsx` (CRLF) | the PM days' rule and the import | 1 |
| `src/lib/system-settings-field-rules.ts` (CRLF) | three whole-number settings rule lines, the import, the comment | 1 |
| `messages/th.json`, `messages/en.json` (CRLF) | +1 key `common.validation.notWholeNumber` | 1 |
| `c/assets/asset-label-batch-tool.tsx` (CRLF) | the three gates, the add-filtered reason line, `addRecentAssets`'s early return | 2 |
| `c/ui/field.tsx` (CRLF) | `liveError?: string \| null`; the region holds `liveError`; `aria-hidden` while the same text | 3 |
| `c/assets/asset-batch-form.tsx` (CRLF) | `rowLiveError`; four row fields | 3 |
| `c/admin/system-settings-form.tsx` (CRLF) | `settingLiveError`; 15 live settings; `LabelTemplatePanel liveErrorFor` and its nine fields; `jsonLiveError`; the prefix | 3 |
| `c/admin/depreciation-policy-builder.tsx` (CRLF) | `jsonLiveError` | 3 |
| `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `.impeccable/design.json` (CRLF) | the form-error rule and the sentences it changes | 4 |
| `tests/form-migration-guards.test.ts`, `tests/asset-status-correction-ui.test.ts`, `tests/validation-guards.test.ts` (CRLF) | comments only | 4 |
| `tests/v-track-f.test.ts` (CRLF) | `common.validation`'s new key (1); the `Field` pins (3) | 1, 3 |
| `tests/v-track2-a.test.ts`, `tests/v-track3.test.ts` (CRLF) | whole-number pins (1); `liveError` pins (3) | 1, 3 |
| `tests/v-track2-u.test.ts`, `tests/v-track2-m.test.ts`, `tests/v-track2-x.test.ts` (CRLF) | whole-number pins | 1 |
| `tests/asset-label-print-ui.test.ts` (CRLF) | the three gates' pins | 2 |
| `tests/asset-forms-ui.test.ts` (CRLF) | `liveError` pins | 3 |
| `tests/v-track-final.test.ts` (new, LF) | one test per code task | 1–4 |
| `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `tests/v-track-docs.test.ts` (CRLF) | the plan's section and entry; the record test; plan 3's order assertion moved | 6 |

No change (checked): every route and schema; `src/lib/field-errors.ts`, `src/lib/field-error-client.ts`, `src/lib/field-focus.ts`, `src/lib/list-pagination.ts`; `c/ui/use-field-errors.ts`, `field-group.tsx`, `searchable-select.tsx`, `empty-note.tsx`, `button.tsx`, `button-variants.ts`; `D/asset-management/labels/page.tsx` (the labels the tool reads exist); `tests/field-primitives.test.ts` (its `Field` signature pin holds: the prop keeps its name), `tests/settings-depreciation-policy-ui.test.ts` (its `jsonError` pin matches across the added line), `tests/assets-sweep-ui.test.ts` (`<EmptyNote\b` stays 3 in the tool), `tests/phase2d-docs.test.ts`, `tests/dark-mode-docs.test.ts`, every guard file's assertions.

## Interfaces between tasks

| Made in | What | Used by |
|---|---|---|
| plans 1–3 (merged) | FIXED 1–12 as amended; `range`, `step`, `decimals`, `RuleCode`; `resolveValidationMessage` (`common.validation.<code>` first); `Field liveError` (a flag), `FieldError`; `settingLiveErrors`, `liveErrors`, `settingError`, `prefixLiveCode`, `liveDuplicates`, `rowError`, `errorText`; `V_SCOPE` = `V_FORMS` | every task |
| Task 1 (VF1) | `wholeNumber(value)`, `RuleCode` `"notWholeNumber"`, `common.validation.notWholeNumber`; `tests/v-track-final.test.ts` with `read`, `messages`, `C` | Tasks 2–6 |
| Task 2 (VF2) | the ids `asset-label-print-reason`, `asset-label-add-filtered-reason` | Tasks 4, 5 |
| Task 3 (VF3) | `Field liveError?: string \| null`; `rowLiveError`, `settingLiveError`, `liveErrorFor`, `jsonLiveError` | Tasks 4, 5 |
| Task 4 (VF4) | `DESIGN.md` **Forms: Errors Under the Field**; docs/14 "A form's errors" and "Form errors" rows | Tasks 6, 7 |
| Task 5 | `.superpowers/sdd/v-track-final/task-5-findings.md` | Task 6 |
| Task 6 | the handoff section and the changelog entry | Task 7 |

---

### Task 0: Branch, baseline, counting evidence and before evidence (controller runs this task, not an implementer)

**Files:**
- Create then delete: a launch configuration for the dev server only while it runs; never committed. If `.claude/launch.json` already holds another session's configuration, add your own entry with its own name and port, and remove only that entry afterwards.
- Evidence (git-ignored): `.superpowers/sdd/screenshots/v-track-final/before/`, `.superpowers/sdd/v-track-final/task-0-baseline.md`, `.superpowers/sdd/v-track-final/task-0-counts/`.

**Interfaces:**
- Consumes: `master` at `71a9e95c`.
- Produces: `feat/v-track-final` with this plan's commit; the baseline numbers; the counting evidence; the before images and the live regions' text that Task 5 compares against.

- [ ] **Step 1: Branch and base.**
  - `git rev-parse master` must print `71a9e95cbb2152d4760bba3e999f77334f615e9d`. If `master` moved, stop and tell the user: every count and old text of this plan is `71a9e95c`'s.
  - The user has answered this plan's open issues (the first line of "Open issues" says so). If not, stop and ask: the tasks write the defaults, and an answer that differs from a default changes a task before it runs.
  - From `master`: `git switch -c feat/v-track-final` (the controller's one branch command; implementers never switch), then copy this plan to `docs/superpowers/plans/2026-10-19-v-track-final.md`, `git add docs/superpowers/plans/2026-10-19-v-track-final.md` and `git commit -m "docs(forms): V track final plan (whole numbers, print queue gates, live fields, the form-error rule)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
  - `git rev-parse --abbrev-ref HEAD` → `feat/v-track-final`; `git diff --name-only 71a9e95c HEAD` lists only this plan; `git status --short` → only the untracked items of the Global Constraints.
- [ ] **Step 2: Baseline.** `npm test` (expected 2305 tests, 2304 pass, 0 fail, 1 skipped), `npx tsc --noEmit` (clean), `npm run lint` (0 errors; record the warning count and that every warning is under `.agents/`). Record the numbers in `task-0-baseline.md`.
- [ ] **Step 3: Temp files.** Check that `<tools>/eol.mjs`, `<tools>/counts.mts` and `<temp>/changes/` exist; hand the paths of `<temp>` and `<tools>` to every implementer. Task 1's change file is written by Task 1 (its text is in the task).
- [ ] **Step 4: Counting evidence at `71a9e95c`** (read-only; save the output under `task-0-counts/`; a difference stops the plan, because an edit's old text would be wrong):
  - `node <tools>/counts.mts .` prints: toasts outside a catch 23 in 11 files; `<form … noValidate>` 47; `messages/th.json` and `en.json` 4083 leaf keys; `V_FORMS` 44; `SELECT_STAR_ONLY` `0 in 0`; FMG `STAR_ONLY` `new Set<string>([])`.
  - Whole numbers: `git grep -nE '\bstep\([^()]*, 1\)' -- src` → 4 lines (`maintenance-plan-form.tsx:48`, `system-settings-field-rules.ts:110`, `:111`, `:112`); `git grep -n 'pattern(String(' -- src` → 2 (`asset-form.tsx:292`, `:293`); `git grep -n 'function wholeNumber' -- src` → `audit-round-form.tsx:73` and `src/lib/list-pagination.ts:15` (the second is page parameters, VF-R2).
  - The print queue (`c/assets/asset-label-batch-tool.tsx`, 754 lines): `grep -c 'disabled={selectedForPrint.length === 0}'` → 2 (lines 499, 503); `grep -c 'disabled={recentAssets.length === 0}'` → 1 (line 359); `grep -c 'aria-disabled'` → 0.
  - Live fields: `git grep -cE '\bliveError(=\{|[[:space:]]|>)' -- src` → `depreciation-policy-builder.tsx:1`, `system-settings-form.tsx:25`, `asset-batch-form.tsx:4`, `asset-form.tsx:2`, `field.tsx:2` (run it on the CRLF working tree, never on a commit: the three bare `liveError` lines of the asset form and the depreciation builder match only through their `\r`).
  - `git ls-files --eol` of every file the File structure names: as the Global Constraints list them (all CRLF).
- [ ] **Step 5: Dev server.**
  - If `preview_list` shows a dev server of this checkout on `:3000`, use it and do not stop it. Otherwise add a launch configuration `name: "asset-vf-dev-3100"`, `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "dev", "-p", "3100"]`, `port: 3100`, `autoPort: false` (if another session's server holds 3100, use 3102 and say so in the baseline file), and start it with `preview_start`.
  - Memory says `.env` points at `asset_management_dev` / `asset_dev`. Confirm this without opening the file: `/th/admin/readiness` shows the database checks. If anything suggests the production database, stop.
  - Every page of this task opens in the Playwright browser (the Playwright MCP tools, `browser_run_code_unsafe` for code), in your own tab. The Browser pane that `preview_start` opens stays on the page it opened: never log in there, never open a form there (no handler covers it).
  - Log in with the seed admin of `prisma/seed.ts` (a `system_admin`); do not echo the password. The login's own request (a POST, before the handler of Step 6) is the one non-GET of this task that reaches the server. Never sign out (a POST) during the task.
- [ ] **Step 6: Write nothing — fulfil or abort every non-GET request.** Before opening any form, route the browser context with exactly this handler (`browser_run_code_unsafe`; plan 3's, unchanged; it keeps its state on the context), and keep it for the rest of the task. Task 5 Step 5 runs the same code unchanged. A `GET` or `HEAD` continues; `PUT /api/admin/settings` is **always fulfilled, never continued**, with the stand-in in `vTrack.standIn` (default: 400 `{ "error": "Something else", "code": "OTHER" }`); every other non-GET is aborted (the asset, audit round and PM plan saves included, if one is ever sent):

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

  - A stand-in for the next settings save: `async (page) => { page.context().vTrack.standIn = { status: 400, body: { … } } }`; the log: `async (page) => page.context().vTrack.log`.
  - **Prove it first, in this order:** (1) `async (page) => page.evaluate(() => fetch("/api/v-track-probe", { method: "POST" }).then(() => "sent", (error) => error.name))` gives `"TypeError"` and the log ends with `POST /api/v-track-probe aborted`; (2) only then `async (page) => page.evaluate(() => fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: "{}" }).then((response) => response.json()))` gives exactly `{ "error": "Something else", "code": "OTHER" }` and the log ends with `PUT /api/admin/settings fulfilled 400` (compare the body, not the status). If either fails (a service worker in the way), stop, set the context up again with `serviceWorkers: "block"` (`browser.newContext`), log in again, and run the handler and both probes before opening any form.
  - If the page or the context is ever recreated, run the handler and both probes again before a form opens.
  - The live region's text, for this step and Step 7: `async (page) => page.evaluate(() => [...document.querySelectorAll('[data-slot="field-error-live"]')].map((region) => ({ id: region.parentElement?.querySelector("input,textarea,select")?.id ?? null, text: region.textContent })).filter((entry) => entry.text))` (every region that holds text, with its field's control id).
- [ ] **Step 7: Before evidence** at 1440 and 375, light and dark (the toggle beside the language button), screenshots to `before/<page>-<state>-<theme>-<width>.png`:
  - **The label print queue** (`/th/asset-management/labels`): as it opens with nothing selected (the two print buttons disabled; Tab skips them; the empty note "ยังไม่ได้เลือกทรัพย์สิน" under them, read by nothing); "เพิ่มตามตัวกรอง" while the scope holds nothing (choose a branch or a location with no assets, or wait for the first load: its label reads "ไม่มีรายการในขอบเขตนี้" and it is disabled); then one asset added (the buttons enabled; do not press print). The accessibility tree of the three buttons each time (`disabled`, no description).
  - **Whole numbers, client only (no request goes out):** `/th/assets/new` with a software-license category (the seats show): total seats `1.5`, save → "รูปแบบไม่ถูกต้อง" under it; `/th/audit/rounds/new`: year `2569.5`, save → "กรุณากรอกเป็นตัวเลข"; `/th/maintenance/pm/new`: custom frequency, days `1.5`, save → "กรุณากรอกเป็นตัวเลข"; `/th/admin/settings` label tab: a 12mm width of `40.5`, save → "กรุณากรอกเป็นตัวเลข". Each time the log has no new entry.
  - **A live field read twice (plan 3 open issue 14):** with the region reader of Step 6 after each: (a) the settings label tab, width `40.5`, save (a save-only rule on a live field): the region of `asset_label_12-width-mm` holds the error; (b) the prefix editor ("เพิ่มคำนำหน้ารหัส" on the asset-numbering tab), save with an empty prefix: the prefix's region holds "กรุณาระบุข้อมูลนี้"; (c) a stand-in 400 `{ "error": "Invalid request data", "code": "VALIDATION_FAILED", "fieldErrors": { "settings.asset_label_12_width_mm": "labelWidthRange" } }` and a save of any change: the width's region holds "ความกว้างป้ายต้องอยู่ระหว่าง 30–120 mm" (set the stand-in back to the default after); (d) a live check while typing: an asset tag template without `{running}`: its region holds the live error (that one stays after Task 3). Write each region's text into `task-0-baseline.md`.
- [ ] **Step 8: Clean up.** Stop your server if you started one and remove your launch configuration (only yours). `git status --short` shows what Step 1 showed. No commit in this task besides Step 1's plan commit.

---

## The code (Tasks 1–4, VF1–VF4)

Spec `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` (approved 2026-10-17): §3 G3, G5; §4.4, §4.5; §7.1–§7.3; §9 item 4; §11 call 2.

### Task 1 (VF1): One whole-number rule with its own sentence (`src/lib/validation-rules.ts`, four forms and rule files, messages)

Spec §4.5 (`validate()` restates the step), §7.1, §7.2; plan 2 P-R8, X-R2, X-R3 (the model); plan 3 open issue 2; VF-R2.

**Files:**
- Modify: `src/lib/validation-rules.ts`, `c/assets/asset-form.tsx`, `c/audit/audit-round-form.tsx`, `c/maintenance/maintenance-plan-form.tsx`, `src/lib/system-settings-field-rules.ts`, `messages/th.json`, `messages/en.json` (all `i/lf w/crlf`)
- Pin: `tests/v-track-f.test.ts`, `tests/v-track2-a.test.ts`, `tests/v-track2-u.test.ts`, `tests/v-track2-m.test.ts`, `tests/v-track2-x.test.ts`, `tests/v-track3.test.ts` (all `i/lf w/crlf`)
- Test: `tests/v-track-final.test.ts` (new, LF)

**Interfaces:**
- Consumes: `isEmpty`, `RuleCode` (`validation-rules.ts:10`), `resolveValidationMessage`.
- Produces: `wholeNumber(value: number | string | null | undefined): RuleCode | null`; `RuleCode` with `"notWholeNumber"`; `common.validation.notWholeNumber`; the test file's `read`, `messages`, `C`.

**Changes at 71a9e95c:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `validation-rules.ts:9–10` | the `tooManyDecimals` comment; `export type RuleCode = FieldErrorCode \| "endBeforeStart" \| "tooManyDecimals"` | a three-line comment; `… \| "tooManyDecimals" \| "notWholeNumber"` | VF-R2 |
| `validation-rules.ts:49–50` | `step`'s comment ("step="0.01" for money, the default step 1 of a whole-number field") | `step` is for a step other than 1; whole numbers use `wholeNumber`, money `decimals` | VF-R2 |
| `validation-rules.ts:57` (after `step`) | — | `wholeNumber` with its comment | VF-R2 |
| `asset-form.tsx:36` | `import { atLeastOne, decimals, maxLength, notBefore, pattern, range, required } from "@/lib/validation-rules"` | `pattern` out (no other caller in the file), `wholeNumber` in | VF-R2 |
| `asset-form.tsx:292–293` | `range(values.licenseTotalSeats, 0) ?? pattern(String(values.licenseTotalSeats ?? ""), /\d+/)` (and the used seats) | `range(…, 0) ?? wholeNumber(…)` | VF-R2 |
| `audit-round-form.tsx:25` | `import { maxLength, notBefore, range, required } from "@/lib/validation-rules"` | `wholeNumber` added | VF-R2 |
| `audit-round-form.tsx:71–76` | the U-R3 comment, the local `function wholeNumber(value: string)` and a blank line | removed (the calls at `:88` and `:92` keep their text and call the shared one) | VF-R2 |
| `maintenance-plan-form.tsx:17` | `import { maxLength, range, required, step } from "@/lib/validation-rules"` | `step` → `wholeNumber` (no other `step` in the file) | VF-R2 |
| `maintenance-plan-form.tsx:48` | `… ?? step(values.intervalDays, 1) : null)` | `… ?? wholeNumber(values.intervalDays) : null)` | VF-R2 |
| `system-settings-field-rules.ts:23` | `import { range, step } from "@/lib/validation-rules"` | `wholeNumber` added (`step` stays for `:113`) | VF-R2 |
| `system-settings-field-rules.ts:105–112` | the comment; three `step(value, 1)` | the comment names `wholeNumber`; `wholeNumber(value)` | VF-R2 |
| `messages/*.json` | — | `common.validation.notWholeNumber` (the change file below) | VF-R2 |

- [ ] **Step 1: The failing test.** Create `tests/v-track-final.test.ts` with exactly this content (a file tool; LF):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { countMatchesByFile, findMatches, readSourceFiles } from "./helpers/source-files.ts"

// V track, the final plan: one whole-number rule, the label print queue's gates, a live field's polite region, and the
// form-error rule in the design docs (spec docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4.4, §4.5,
// §7.2, §7.3, §9). One test per task, appended in order. The working tree is CRLF on Windows: every read strips \r.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
const C = "src/components/"

test("one whole-number rule: every whole-number field reads its own sentence for a fraction (v-track final task 1, VF1)", async () => {
  const rules = (await import("../src/lib/validation-rules.ts")) as Record<string, unknown>
  assert.equal(typeof rules.wholeNumber, "function", "validation-rules.ts exports wholeNumber")
  const wholeNumber = rules.wholeNumber as (value: number | string | null | undefined) => string | null
  for (const value of ["0", "12", " 7 ", "2026", "1.0", "-3", "1e3", 5]) assert.equal(wholeNumber(value), null, String(value))
  for (const value of ["1.5", "40.5", "0.3", "2569.5", 2.5]) assert.equal(wholeNumber(value), "notWholeNumber", String(value))
  assert.equal(wholeNumber("abc"), "invalidNumber")
  for (const empty of ["", "  ", null, undefined]) assert.equal(wholeNumber(empty), null, "an empty value is left to required")
  const source = read("src/lib/validation-rules.ts")
  assert.match(source, /^export function wholeNumber\(value: number \| string \| null \| undefined\): RuleCode \| null \{$/m)
  assert.match(source, /^export type RuleCode = FieldErrorCode \| "endBeforeStart" \| "tooManyDecimals" \| "notWholeNumber"$/m)
  // Its own sentence, clearer than invalidNumber's "กรุณากรอกเป็นตัวเลข" (plan 3 open issue 2).
  assert.equal(messages("th").common.validation.notWholeNumber, "กรุณากรอกเป็นจำนวนเต็ม")
  assert.equal(messages("en").common.validation.notWholeNumber, "Enter a whole number")
  // Every whole-number field writes the shared rule after its range (plan 2 P-R8's three restatements are gone).
  const sites: Record<string, readonly string[]> = {
    [`${C}assets/asset-form.tsx`]: [
      'check("licenseTotalSeats", range(values.licenseTotalSeats, 0) ?? wholeNumber(values.licenseTotalSeats))',
      'check("licenseUsedSeats", range(values.licenseUsedSeats, 0) ?? wholeNumber(values.licenseUsedSeats) ?? seatsExceeded(values))',
    ],
    [`${C}audit/audit-round-form.tsx`]: [
      'check("auditYear", required(values.auditYear) ?? range(values.auditYear, yearRange.min, yearRange.max) ?? wholeNumber(values.auditYear))',
      'check("sampleRate", required(values.sampleRate) ?? range(values.sampleRate, 1, 100) ?? wholeNumber(values.sampleRate))',
    ],
    [`${C}maintenance/maintenance-plan-form.tsx`]: [
      'check("intervalDays", values.frequency === "custom" ? required(values.intervalDays) ?? range(values.intervalDays, 1, 3650) ?? wholeNumber(values.intervalDays) : null)',
    ],
    "src/lib/system-settings-field-rules.ts": [
      'if (key === "asset_tag_running_digits") return range(value, 1, 12) ?? wholeNumber(value)',
      "if (key === ldapSyncMaxScheduledDeactivationsKey) return range(value, 0) ?? wholeNumber(value)",
      "if (key === operationDocumentRunningDigitsKey || labelWidthKeys.has(key) || labelHeightKeys.has(key) || labelQrSizeKeys.has(key)) return wholeNumber(value)",
      // A label's margin and gap keep their 0.5 step (not a whole number).
      "if (labelSpacingKeys.has(key)) return step(value, 0.5)",
    ],
  }
  for (const [path, lines] of Object.entries(sites)) {
    const text = read(path)
    for (const line of lines) assert.ok(text.includes(line), `${path}: ${line}`)
    assert.match(text, /^import \{[^}]*\bwholeNumber\b[^}]*\} from "@\/lib\/validation-rules"$/m, path)
    assert.doesNotMatch(text, /pattern\(String\(|function wholeNumber\(|Number\.isInteger\(Number\(value\.trim/, `${path}: no rule of its own`)
  }
  // No form restates a whole number with step(v, 1) any more.
  assert.deepEqual(findMatches(readSourceFiles("src"), /\bstep\([^()]*, 1\)/g), [])
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-final.test.ts`. Expected: 1 test, 1 fail: "one whole-number rule: every whole-number field reads its own sentence for a fraction (v-track final task 1, VF1)", with `AssertionError [ERR_ASSERTION]: validation-rules.ts exports wholeNumber` (`validation-rules.ts` exports no `wholeNumber` at `71a9e95c`).
- [ ] **Step 3: Implement** (exact; the Edit tool keeps each file's CRLF):

- `src/lib/validation-rules.ts`, edit 1 of 3. Old:

```ts
// "tooManyDecimals" is the money rule's own code (common.validation.tooManyDecimals, v-track plan 2 task 31c).
export type RuleCode = FieldErrorCode | "endBeforeStart" | "tooManyDecimals"
```

  New:

```ts
// "tooManyDecimals" is the money rule's own code (common.validation.tooManyDecimals, v-track plan 2 task 31c), and
// "notWholeNumber" the whole-number rule's (common.validation.notWholeNumber, v-track final task 1). The server sends
// neither: its .int() refusal reads invalidNumber (v-track plan 2 X-R2).
export type RuleCode = FieldErrorCode | "endBeforeStart" | "tooManyDecimals" | "notWholeNumber"
```

- `src/lib/validation-rules.ts`, edit 2 of 3. Old:

```ts
// A number field's step (step="0.01" for money, the default step 1 of a whole-number field): a whole multiple of size.
// Off the step is "invalidNumber", the code the server gives zod's not_multiple_of; text that is not a number too.
```

  New:

```ts
// A number field's step other than 1 (step="0.5" of a label's margin and gap): a whole multiple of size. Off the step is
// "invalidNumber", the code the server gives zod's not_multiple_of; text that is not a number too. A whole-number field
// uses wholeNumber and a money field decimals, each with its own sentence.
```

- `src/lib/validation-rules.ts`, edit 3 of 3. Old:

```ts
  return Math.abs(steps - Math.round(steps)) < 1e-6 ? null : "invalidNumber"
}
```

  New:

```ts
  return Math.abs(steps - Math.round(steps)) < 1e-6 ? null : "invalidNumber"
}

// A whole-number field (a number input with the default step of 1: license seats, an audit round's year and sample rate,
// the PM days, the settings' running digits, deactivation limit and label sizes): a fraction has its own sentence,
// "notWholeNumber" (v-track final task 1; it replaced the seats' pattern, the audit round's own helper and the step of
// 1). Text that is not a number is "invalidNumber"; an empty value is left to required. Write it after range:
// range(v, 0) ?? wholeNumber(v).
export function wholeNumber(value: number | string | null | undefined): RuleCode | null {
  if (isEmpty(value)) return null
  const number = typeof value === "number" ? value : Number((value as string).trim())
  if (!Number.isFinite(number)) return "invalidNumber"
  return Number.isInteger(number) ? null : "notWholeNumber"
}
```

- `src/components/assets/asset-form.tsx`, edit 1 of 2. Old:

```tsx
import { atLeastOne, decimals, maxLength, notBefore, pattern, range, required } from "@/lib/validation-rules"
```

  New:

```tsx
import { atLeastOne, decimals, maxLength, notBefore, range, required, wholeNumber } from "@/lib/validation-rules"
```

- `src/components/assets/asset-form.tsx`, edit 2 of 2. Old:

```tsx
    check("licenseTotalSeats", range(values.licenseTotalSeats, 0) ?? pattern(String(values.licenseTotalSeats ?? ""), /\d+/))
    check("licenseUsedSeats", range(values.licenseUsedSeats, 0) ?? pattern(String(values.licenseUsedSeats ?? ""), /\d+/) ?? seatsExceeded(values))
```

  New:

```tsx
    check("licenseTotalSeats", range(values.licenseTotalSeats, 0) ?? wholeNumber(values.licenseTotalSeats))
    check("licenseUsedSeats", range(values.licenseUsedSeats, 0) ?? wholeNumber(values.licenseUsedSeats) ?? seatsExceeded(values))
```

- `src/components/audit/audit-round-form.tsx`, edit 1 of 2. Old:

```tsx
import { maxLength, notBefore, range, required } from "@/lib/validation-rules"
```

  New:

```tsx
import { maxLength, notBefore, range, required, wholeNumber } from "@/lib/validation-rules"
```

- `src/components/audit/audit-round-form.tsx`, edit 2 of 2. Old:

```tsx
// A number field's step is 1 unless it says otherwise, and the browser checked it before noValidate; the server's year
// and sample rate are whole numbers too (v-track U-R3).
function wholeNumber(value: string) {
  return Number.isInteger(Number(value.trim())) ? null : "invalidNumber"
}

// noValidate turns the browser's check off, so this restates the controls' required, maxLength, min, max and step, and
```

  New:

```tsx
// noValidate turns the browser's check off, so this restates the controls' required, maxLength, min, max and step, and
```

- `src/components/maintenance/maintenance-plan-form.tsx`, edit 1 of 2. Old:

```tsx
import { maxLength, range, required, step } from "@/lib/validation-rules"
```

  New:

```tsx
import { maxLength, range, required, wholeNumber } from "@/lib/validation-rules"
```

- `src/components/maintenance/maintenance-plan-form.tsx`, edit 2 of 2. Old:

```tsx
  check("intervalDays", values.frequency === "custom" ? required(values.intervalDays) ?? range(values.intervalDays, 1, 3650) ?? step(values.intervalDays, 1) : null)
```

  New:

```tsx
  check("intervalDays", values.frequency === "custom" ? required(values.intervalDays) ?? range(values.intervalDays, 1, 3650) ?? wholeNumber(values.intervalDays) : null)
```

- `src/lib/system-settings-field-rules.ts`, edit 1 of 2. Old:

```ts
import { range, step } from "@/lib/validation-rules"
```

  New:

```ts
import { range, step, wholeNumber } from "@/lib/validation-rules"
```

- `src/lib/system-settings-field-rules.ts`, edit 2 of 2. Old:

```ts
// What the control itself allowed before noValidate, where the server allows more: the asset tag's running digits
// (min 1, max 12), the LDAP sync's deactivation limit (min 0), and the step of the number fields (1, or 0.5 for a label's
// margin and gap). Client rules only (spec §6.3: no new server rule); a save checks them only on the settings it
// changes (settingSaveErrors).
export function settingControlCode(key: string, value: string): string | null {
  if (key === "asset_tag_running_digits") return range(value, 1, 12) ?? step(value, 1)
  if (key === ldapSyncMaxScheduledDeactivationsKey) return range(value, 0) ?? step(value, 1)
  if (key === operationDocumentRunningDigitsKey || labelWidthKeys.has(key) || labelHeightKeys.has(key) || labelQrSizeKeys.has(key)) return step(value, 1)
```

  New:

```ts
// What the control itself allowed before noValidate, where the server allows more: the asset tag's running digits
// (min 1, max 12), the LDAP sync's deactivation limit (min 0), whole numbers (the shared wholeNumber, v-track final
// task 1) and the 0.5 step of a label's margin and gap. Client rules only (spec §6.3: no new server rule); a save checks
// them only on the settings it changes (settingSaveErrors).
export function settingControlCode(key: string, value: string): string | null {
  if (key === "asset_tag_running_digits") return range(value, 1, 12) ?? wholeNumber(value)
  if (key === ldapSyncMaxScheduledDeactivationsKey) return range(value, 0) ?? wholeNumber(value)
  if (key === operationDocumentRunningDigitsKey || labelWidthKeys.has(key) || labelHeightKeys.has(key) || labelQrSizeKeys.has(key)) return wholeNumber(value)
```

- The message, through the script. Write `<temp>/changes/vf1-messages.json` with exactly this one line (a file tool):

```json
{"set":{"th":{"common.validation.notWholeNumber":"กรุณากรอกเป็นจำนวนเต็ม"},"en":{"common.validation.notWholeNumber":"Enter a whole number"}}}
```

  then run `node scripts/messages-edit.mjs <temp>/changes/vf1-messages.json` (it prints `messages updated: 1 th, 1 en, 0 deleted`).

  After Step 3 and before Step 4, `npm test` fails exactly these 7 tests (each pins the old rule or the old key set): "every code has a Thai and an English message, with its limits when the form gives them (V spec §6.1, §7.1)" (`v-track-f`: the `common.validation` object gains a key); "asset form: validate() restates every rule the toasts said, the save gates name their reason, and the warranty pair holds (v-track A1)" (`v-track2-a:93–94`); "audit round: the date pair limits its pickers, validate() restates every rule, and save and preview show the server's refusal under the field (v-track U1)" (`v-track2-u:80`); "PM plan: errors under the field, the asset select checked, whole days from 1 to 3650, and the server's refusals on the same fields (v-track2 M3)" (`v-track2-m:168`); "one money rule: every money field of plan 2's forms refuses more than 2 decimal places with its own sentence (v-track plan 2 task 31c)" (`v-track2-x:153`, `:179`); "the settings rules answer what the server answers for every setting, and the controls' own limits on top (v-track plan 3 task 1, ST1)" (`v-track3:101–106`, `:113`); "a stored value only a control's own limit refuses stops a save only when the save changes that setting (v-track plan 3 task 1, ST1, open issue 13)" (`v-track3:143`). Step 4 is their edits.
- [ ] **Step 4: Pin edits** (exact; each old string occurs once):

- `tests/v-track-f.test.ts`, edit 1 of 1. Old:

```ts
    tooManyDecimals: "กรอกทศนิยมได้ไม่เกิน 2 ตำแหน่ง",
  })
```

  New:

```ts
    tooManyDecimals: "กรอกทศนิยมได้ไม่เกิน 2 ตำแหน่ง",
    notWholeNumber: "กรุณากรอกเป็นจำนวนเต็ม",
  })
```

- `tests/v-track2-a.test.ts`, edit 1 of 1. Old:

```ts
    'check("licenseTotalSeats", range(values.licenseTotalSeats, 0) ?? pattern(String(values.licenseTotalSeats ?? ""), /\\d+/))',
    'check("licenseUsedSeats", range(values.licenseUsedSeats, 0) ?? pattern(String(values.licenseUsedSeats ?? ""), /\\d+/) ?? seatsExceeded(values))',
```

  New:

```ts
    // The seats are whole numbers: the shared rule (v-track final task 1).
    'check("licenseTotalSeats", range(values.licenseTotalSeats, 0) ?? wholeNumber(values.licenseTotalSeats))',
    'check("licenseUsedSeats", range(values.licenseUsedSeats, 0) ?? wholeNumber(values.licenseUsedSeats) ?? seatsExceeded(values))',
```

- `tests/v-track2-u.test.ts`, edit 1 of 1. Old:

```ts
  // The number fields' step of 1, which the browser checked before noValidate (U-R3).
  assert.match(source, /function wholeNumber\(value: string\) \{\n\s+return Number\.isInteger\(Number\(value\.trim\(\)\)\) \? null : "invalidNumber"\n\}/)
```

  New:

```ts
  // The number fields' step of 1, which the browser checked before noValidate (U-R3): the shared whole-number rule, not a
  // helper of the form's own (v-track final task 1).
  assert.match(source, /^import \{ maxLength, notBefore, range, required, wholeNumber \} from "@\/lib\/validation-rules"$/m)
  assert.doesNotMatch(source, /function wholeNumber\(/)
```

- `tests/v-track2-m.test.ts`, edit 1 of 1. Old:

```ts
    'check("intervalDays", values.frequency === "custom" ? required(values.intervalDays) ?? range(values.intervalDays, 1, 3650) ?? step(values.intervalDays, 1) : null)',
```

  New:

```ts
    'check("intervalDays", values.frequency === "custom" ? required(values.intervalDays) ?? range(values.intervalDays, 1, 3650) ?? wholeNumber(values.intervalDays) : null)',
```

- `tests/v-track2-x.test.ts`, edit 1 of 2. Old:

```ts
  assert.match(read("src/lib/validation-rules.ts"), /^export type RuleCode = FieldErrorCode \| "endBeforeStart" \| "tooManyDecimals"$/m)
```

  New:

```ts
  assert.match(read("src/lib/validation-rules.ts"), /^export type RuleCode = FieldErrorCode \| "endBeforeStart" \| "tooManyDecimals" \| "notWholeNumber"$/m)
```

- `tests/v-track2-x.test.ts`, edit 2 of 2. Old:

```ts
  // Whole numbers keep step() and invalidNumber: the PM days.
  assert.ok(read(`${C}maintenance/maintenance-plan-form.tsx`).includes("range(values.intervalDays, 1, 3650) ?? step(values.intervalDays, 1)"))
```

  New:

```ts
  // Whole numbers have their own rule and sentence, wholeNumber and notWholeNumber: the PM days (v-track final task 1).
  assert.ok(read(`${C}maintenance/maintenance-plan-form.tsx`).includes("range(values.intervalDays, 1, 3650) ?? wholeNumber(values.intervalDays)"))
```

- `tests/v-track3.test.ts`, edit 1 of 3. Old:

```ts
    ["asset_tag_running_digits", "2.5", "invalidNumber"],
    ["asset_tag_running_digits", "", null],
    ["ldap_sync_max_scheduled_deactivations", "-1", "outOfRange"],
    ["ldap_sync_max_scheduled_deactivations", "1.5", "invalidNumber"],
    ["operation_document_running_digits", "4.5", "invalidNumber"],
    ["asset_label_12_width_mm", "40.5", "invalidNumber"],
```

  New:

```ts
    ["asset_tag_running_digits", "2.5", "notWholeNumber"],
    ["asset_tag_running_digits", "", null],
    ["ldap_sync_max_scheduled_deactivations", "-1", "outOfRange"],
    ["ldap_sync_max_scheduled_deactivations", "1.5", "notWholeNumber"],
    ["operation_document_running_digits", "4.5", "notWholeNumber"],
    ["asset_label_12_width_mm", "40.5", "notWholeNumber"],
```

- `tests/v-track3.test.ts`, edit 2 of 3. Old:

```ts
  assert.deepEqual(rules.settingSaveErrors(defaults.map((entry) => (entry.key === "asset_label_12_width_mm" ? { ...entry, value: "40.5" } : entry)), [], every), { "settings.asset_label_12_width_mm": "invalidNumber" })
```

  New:

```ts
  assert.deepEqual(rules.settingSaveErrors(defaults.map((entry) => (entry.key === "asset_label_12_width_mm" ? { ...entry, value: "40.5" } : entry)), [], every), { "settings.asset_label_12_width_mm": "notWholeNumber" })
```

- `tests/v-track3.test.ts`, edit 3 of 3. Old:

```ts
  const codes: [string, string][] = [["asset_tag_running_digits", "outOfRange"], ["asset_label_12_width_mm", "invalidNumber"], ["asset_label_custom_margin_mm", "invalidNumber"]]
```

  New:

```ts
  const codes: [string, string][] = [["asset_tag_running_digits", "outOfRange"], ["asset_label_12_width_mm", "notWholeNumber"], ["asset_label_custom_margin_mm", "invalidNumber"]]
```

- [ ] **Step 5: Verify.** `node --test tests/v-track-final.test.ts tests/v-track-f.test.ts tests/v-track2-a.test.ts tests/v-track2-u.test.ts tests/v-track2-m.test.ts tests/v-track2-x.test.ts tests/v-track3.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts` (0 fail); `npm test` (+1; **2306 tests, 2305 pass, 0 fail, 1 skipped**); `npx tsc --noEmit`; `npm run lint` (0 errors, the baseline's warnings). `node <tools>/eol.mjs src/lib/validation-rules.ts src/components/assets/asset-form.tsx src/components/audit/audit-round-form.tsx src/components/maintenance/maintenance-plan-form.tsx src/lib/system-settings-field-rules.ts messages/th.json messages/en.json tests/v-track-final.test.ts` prints `108 108`, `2076 2076`, `389 389`, `230 230`, `186 186`, `4266 4266`, `4266 4266` and `0 56`; `node <tools>/eol.mjs tests/v-track-f.test.ts tests/v-track2-a.test.ts tests/v-track2-u.test.ts tests/v-track2-m.test.ts tests/v-track2-x.test.ts tests/v-track3.test.ts` prints `249 249`, `312 312`, `221 221`, `294 294`, `215 215` and `368 368`.
- [ ] **Step 6: Commit.** `git add src/lib/validation-rules.ts src/components/assets/asset-form.tsx src/components/audit/audit-round-form.tsx src/components/maintenance/maintenance-plan-form.tsx src/lib/system-settings-field-rules.ts messages/th.json messages/en.json tests/v-track-final.test.ts tests/v-track-f.test.ts tests/v-track2-a.test.ts tests/v-track2-u.test.ts tests/v-track2-m.test.ts tests/v-track2-x.test.ts tests/v-track3.test.ts`, then `git commit -m "feat(forms): one whole-number rule with its own sentence (v-track final task 1, VF1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 2 (VF2): The label print queue's three buttons wait with their reason beside them (`c/assets/asset-label-batch-tool.tsx`)

Spec §4.4 (a prerequisite keeps its gate and always says why), §11 call 2; plan 1 M-R10; plan 2 open issue 16; VF-R3.

**Files:**
- Modify: `src/components/assets/asset-label-batch-tool.tsx` (`i/lf w/crlf`)
- Pin: `tests/asset-label-print-ui.test.ts` (`i/lf w/crlf`)
- Test: `tests/v-track-final.test.ts` (LF, append)

**Interfaces:**
- Consumes: `selectedForPrint`, `recentAssets`, `labels.noSelected`, `labels.addFilteredQueue`, `labels.addFilteredQueueUnavailable`; `Button`'s `aria-disabled` look (`button-variants.ts:18`: focusable, faint, no pointer events); `EmptyNote` passes `id` on (`empty-note.tsx:5`, `...props`).
- Produces: the ids `asset-label-print-reason` and `asset-label-add-filtered-reason`.

**Changes at 71a9e95c:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:247–249` `addRecentAssets` | merges `recentAssets` | a comment and `if (recentAssets.length === 0) return` first | M-R10 |
| `:356–362` add filtered | `<Button disabled={recentAssets.length === 0} onClick={addRecentAssets} …>` whose label is the reason while empty | one label (`labels.addFilteredQueue`); `aria-disabled` / `aria-describedby="asset-label-add-filtered-reason"`; the reason as a `<p>` under the scope summary while the gate holds | VF-R3 |
| `:499` print one test label | `<Button variant="outline" disabled={selectedForPrint.length === 0} onClick={printFirstLabel} className="w-full">` | one prop per line, `aria-disabled` / `aria-describedby="asset-label-print-reason"` | VF-R3 |
| `:503` print | `<Button disabled={selectedForPrint.length === 0} onClick={printLabels} className="w-full">` | the same | VF-R3 |
| `:511` | `<EmptyNote>{labels.noSelected}</EmptyNote>` | `<EmptyNote id="asset-label-print-reason">` | VF-R3 |

`printLabels` (`:251–254`) and `printFirstLabel` (`:256–260`) already return first; they do not change.

- [ ] **Step 1: The failing test.** Append to `tests/v-track-final.test.ts` exactly this block (a file tool):

```ts

test("the print queue's three buttons wait with their reason beside them (v-track final task 2, VF2)", () => {
  const source = read(`${C}assets/asset-label-batch-tool.tsx`)
  // Add filtered: one label; aria-disabled while the scope holds nothing, tied to the line that says so; the handler
  // returns first (spec §4.4; plan 2 open issue 16).
  assert.match(source, /<Button\n\s+aria-disabled=\{recentAssets\.length === 0 \|\| undefined\}\n\s+aria-describedby=\{recentAssets\.length === 0 \? "asset-label-add-filtered-reason" : undefined\}\n\s+onClick=\{addRecentAssets\}\n\s+className="w-full shrink-0 sm:w-auto"\n\s+>\n\s+<Plus aria-hidden="true" \/>\n\s+\{labels\.addFilteredQueue\}\n\s+<\/Button>/)
  assert.match(source, /\{recentAssets\.length === 0 \? \(\n\s+<p id="asset-label-add-filtered-reason" className="mt-1 text-meta text-muted-foreground">\n\s+\{labels\.addFilteredQueueUnavailable\}\n\s+<\/p>\n\s+\) : null\}\n\s+<\/div>\n\s+<Button\n/)
  assert.match(source, /function addRecentAssets\(\) \{\n(?:\s+\/\/[^\n]*\n)+\s+if \(recentAssets\.length === 0\) return\n\s+setSelected\(/)
  // The two print buttons: aria-disabled with nothing selected, tied to the empty note under them; both handlers already
  // return first.
  assert.match(source, /<Button\n\s+variant="outline"\n\s+aria-disabled=\{selectedForPrint\.length === 0 \|\| undefined\}\n\s+aria-describedby=\{selectedForPrint\.length === 0 \? "asset-label-print-reason" : undefined\}\n\s+onClick=\{printFirstLabel\}\n\s+className="w-full"\n\s+>/)
  assert.match(source, /<Button\n\s+aria-disabled=\{selectedForPrint\.length === 0 \|\| undefined\}\n\s+aria-describedby=\{selectedForPrint\.length === 0 \? "asset-label-print-reason" : undefined\}\n\s+onClick=\{printLabels\}\n\s+className="w-full"\n\s+>/)
  assert.ok(source.includes('<EmptyNote id="asset-label-print-reason">{labels.noSelected}</EmptyNote>'))
  assert.match(source, /function printLabels\(\) \{\n\s+if \(selectedForPrint\.length === 0\) return\n/)
  assert.match(source, /function printFirstLabel\(\) \{\n\s+const \[firstAsset\] = selectedForPrint\n\s+if \(!firstAsset\) return\n/)
  // No plain disabled gate is left on the three, and the add button no longer swaps its label for the reason.
  assert.doesNotMatch(source, /\bdisabled=\{(?:recentAssets|selectedForPrint)\.length === 0\}/)
  assert.doesNotMatch(source, /labels\.addFilteredQueueUnavailable : labels\.addFilteredQueue/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-final.test.ts`. Expected: 2 tests, 1 fail: "the print queue's three buttons wait with their reason beside them (v-track final task 2, VF2)" (`AssertionError [ERR_ASSERTION]: The input did not match the regular expression /<Button\n\s+aria-disabled=\{recentAssets\.length === 0 …/`: the add button is a one-line `disabled` button at `:359`).
- [ ] **Step 3: Implement** (exact; the Edit tool keeps the file's CRLF):

- `src/components/assets/asset-label-batch-tool.tsx`, edit 1 of 5. Old:

```tsx
  function addRecentAssets() {
    setSelected((current) => mergeSelectedAssets(current, recentAssets))
  }
```

  New:

```tsx
  function addRecentAssets() {
    // Nothing in this scope is a prerequisite, not a field: the button waits and the line beside it says why (spec §4.4,
    // v-track final task 2). Enter or Space on it still reaches here.
    if (recentAssets.length === 0) return
    setSelected((current) => mergeSelectedAssets(current, recentAssets))
  }
```

- `src/components/assets/asset-label-batch-tool.tsx`, edit 2 of 5. Old:

```tsx
                    <p className="mt-1 text-meta text-muted-foreground">{labels.queueScopeHelp}</p>
                  ) : null}
                </div>
                <Button disabled={recentAssets.length === 0} onClick={addRecentAssets} className="w-full shrink-0 sm:w-auto">
                  <Plus aria-hidden="true" />
                  {recentAssets.length === 0 ? labels.addFilteredQueueUnavailable : labels.addFilteredQueue}
                </Button>
```

  New:

```tsx
                    <p className="mt-1 text-meta text-muted-foreground">{labels.queueScopeHelp}</p>
                  ) : null}
                  {recentAssets.length === 0 ? (
                    <p id="asset-label-add-filtered-reason" className="mt-1 text-meta text-muted-foreground">
                      {labels.addFilteredQueueUnavailable}
                    </p>
                  ) : null}
                </div>
                <Button
                  aria-disabled={recentAssets.length === 0 || undefined}
                  aria-describedby={recentAssets.length === 0 ? "asset-label-add-filtered-reason" : undefined}
                  onClick={addRecentAssets}
                  className="w-full shrink-0 sm:w-auto"
                >
                  <Plus aria-hidden="true" />
                  {labels.addFilteredQueue}
                </Button>
```

- `src/components/assets/asset-label-batch-tool.tsx`, edit 3 of 5. Old:

```tsx
              <Button variant="outline" disabled={selectedForPrint.length === 0} onClick={printFirstLabel} className="w-full">
```

  New:

```tsx
              <Button
                variant="outline"
                aria-disabled={selectedForPrint.length === 0 || undefined}
                aria-describedby={selectedForPrint.length === 0 ? "asset-label-print-reason" : undefined}
                onClick={printFirstLabel}
                className="w-full"
              >
```

- `src/components/assets/asset-label-batch-tool.tsx`, edit 4 of 5. Old:

```tsx
              <Button disabled={selectedForPrint.length === 0} onClick={printLabels} className="w-full">
```

  New:

```tsx
              <Button
                aria-disabled={selectedForPrint.length === 0 || undefined}
                aria-describedby={selectedForPrint.length === 0 ? "asset-label-print-reason" : undefined}
                onClick={printLabels}
                className="w-full"
              >
```

- `src/components/assets/asset-label-batch-tool.tsx`, edit 5 of 5. Old:

```tsx
            <EmptyNote>{labels.noSelected}</EmptyNote>
```

  New:

```tsx
            <EmptyNote id="asset-label-print-reason">{labels.noSelected}</EmptyNote>
```

  After Step 3 and before Step 4, `node --test tests/asset-label-print-ui.test.ts` fails one test: "the label batch tool uses PageHeader, shared fields and Button (2C batch 4)" (its three one-line `disabled` button pins at `:195`, `:198`, `:199`). Step 4 is its edits.
- [ ] **Step 4: Pin edits** (exact; each old string occurs once):

- `tests/asset-label-print-ui.test.ts`, edit 1 of 2. Old:

```ts
  assert.match(source, /<Button disabled=\{recentAssets\.length === 0\} onClick=\{addRecentAssets\} className="w-full shrink-0 sm:w-auto">/)
```

  New:

```ts
  // The three gates of the queue stay focusable and say why (v-track final task 2).
  assert.match(source, /<Button\n\s+aria-disabled=\{recentAssets\.length === 0 \|\| undefined\}\n\s+aria-describedby=\{recentAssets\.length === 0 \? "asset-label-add-filtered-reason" : undefined\}\n\s+onClick=\{addRecentAssets\}\n\s+className="w-full shrink-0 sm:w-auto"\n\s+>/)
```

- `tests/asset-label-print-ui.test.ts`, edit 2 of 2. Old:

```ts
  assert.match(source, /<Button variant="outline" disabled=\{selectedForPrint\.length === 0\} onClick=\{printFirstLabel\} className="w-full">/)
  assert.match(source, /<Button disabled=\{selectedForPrint\.length === 0\} onClick=\{printLabels\} className="w-full">/)
```

  New:

```ts
  assert.match(source, /<Button\n\s+variant="outline"\n\s+aria-disabled=\{selectedForPrint\.length === 0 \|\| undefined\}\n\s+aria-describedby=\{selectedForPrint\.length === 0 \? "asset-label-print-reason" : undefined\}\n\s+onClick=\{printFirstLabel\}\n\s+className="w-full"\n\s+>/)
  assert.match(source, /<Button\n\s+aria-disabled=\{selectedForPrint\.length === 0 \|\| undefined\}\n\s+aria-describedby=\{selectedForPrint\.length === 0 \? "asset-label-print-reason" : undefined\}\n\s+onClick=\{printLabels\}\n\s+className="w-full"\n\s+>/)
```

- [ ] **Step 5: Verify.** `node --test tests/v-track-final.test.ts tests/asset-label-print-ui.test.ts tests/assets-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts` (0 fail); `npm test` (+1; **2307 tests, 2306 pass, 0 fail, 1 skipped**); `npx tsc --noEmit`; `npm run lint` (0 errors). `node <tools>/eol.mjs src/components/assets/asset-label-batch-tool.tsx tests/asset-label-print-ui.test.ts tests/v-track-final.test.ts` prints `778 778`, `224 224` and `0 75`.
- [ ] **Step 6: Commit.** `git add src/components/assets/asset-label-batch-tool.tsx tests/asset-label-print-ui.test.ts tests/v-track-final.test.ts`, then `git commit -m "feat(assets): the label print queue's three buttons wait with their reason beside them (v-track final task 2, VF2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 3 (VF3): A live field's polite region reads only its live check (`c/ui/field.tsx` and its callers)

Spec §7.3 ("errors shown by submit are read through focus and `aria-describedby`, not as N alerts"; "the live duplicate errors keep a polite live announcement"), G5, U8; plan 1 F-R6; plan 3 ST-R3 and open issue 14; VF-R4.

**Files:**
- Modify: `src/components/ui/field.tsx`, `src/components/assets/asset-form.tsx`, `src/components/assets/asset-batch-form.tsx`, `src/components/admin/system-settings-form.tsx`, `src/components/admin/depreciation-policy-builder.tsx` (all `i/lf w/crlf`)
- Pin: `tests/v-track-f.test.ts`, `tests/asset-forms-ui.test.ts`, `tests/v-track2-a.test.ts`, `tests/v-track3.test.ts` (all `i/lf w/crlf`)
- Test: `tests/v-track-final.test.ts` (LF, append)

**Interfaces:**
- Consumes: `duplicateState`, `errorText` (asset form); `liveDuplicates`, `rowKey`, `rowError`, `RowField` (batch, `:318–336`); `liveErrors`, `settingFieldKey`, `settingControlParams`, `validationMessage`, `labels.invalidPrefix`, `prefixLiveCode` (settings form, `:760–790`).
- Produces: `Field liveError?: string | null`; `rowLiveError(index, field)`; `settingLiveError(key)`; `LabelTemplatePanel({ liveErrorFor })`; `DepreciationPolicyBuilder({ jsonLiveError })`.

**Changes at 71a9e95c:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `field.tsx:20–22` | `liveError?: boolean` with its comment | `liveError?: string \| null` with the rule (VF-R4) | VF-R4 |
| `field.tsx:71` | `<FieldError id={errorId} aria-hidden={liveError \|\| undefined}>` | `aria-hidden={(liveError && liveError === error) \|\| undefined}` | VF-R4 |
| `field.tsx:72` | `{liveError ? <span … aria-live="polite">{error}</span> : null}` | `{liveError !== undefined ? <span … aria-live="polite">{liveError}</span> : null}` | VF-R4 |
| `asset-form.tsx:1025`, `:1082` | `liveError` | `liveError={duplicateState.assetTagExists ? t("duplicateAssetTag") : null}` (and the serial's) | VF-R4 |
| `asset-batch-form.tsx:335–336` | `rowError` | `rowError` unchanged; `rowLiveError` after it | VF-R4 |
| `asset-batch-form.tsx:1064`, `:1067`, `:1112`, `:1117` | `liveError error={rowError(index, "…")}` | `liveError={rowLiveError(index, "…")} error={rowError(index, "…")}` | VF-R4 |
| `system-settings-form.tsx:785–790` | `settingError` | unchanged; `settingLiveError` after it | VF-R4 |
| `system-settings-form.tsx` 15 lines (`:1035`, `:1120`, `:1204`, `:1212`, `:1220`, `:1516`, `:1526`, `:1536`, `:1546`, `:1588`, `:1598`, `:1636`, `:1646`, `:1656`, `:1921`) | `error={settingError(KEY)} liveError>` | `error={settingError(KEY)} liveError={settingLiveError(KEY)}>` | VF-R4 |
| `system-settings-form.tsx:1180` | `errorFor={settingError}` | and `liveErrorFor={settingLiveError}` | VF-R4 |
| `system-settings-form.tsx:1366` | the prefix `Field … liveError>` | `liveError={prefixLiveCode ? labels.invalidPrefix : null}` | VF-R4 |
| `system-settings-form.tsx:1504` | `jsonError={settingError(depreciationPolicySettingKey)}` | and `jsonLiveError={settingLiveError(depreciationPolicySettingKey)}` | VF-R4 |
| `system-settings-form.tsx:2423–2438` `LabelTemplatePanel` | props `errorFor` | and `liveErrorFor?: (key: string) => string \| null` | VF-R4 |
| `system-settings-form.tsx` 9 lines (`:2465`–`:2547`) | `error={errorFor?.(`${prefix}_SUFFIX`)} liveError>` | `… liveError={liveErrorFor?.(`${prefix}_SUFFIX`)}>` | VF-R4 |
| `depreciation-policy-builder.tsx:75–78` props, `:80` signature, `:349` | `jsonError` only; `liveError` | `jsonLiveError?: string \| null`; destructured; `liveError={jsonLiveError}` | VF-R4 |

`error` stays as it is at every site: it shows the live text first (`settingError`, `rowError`, the asset form's ternaries, `prefixEditorError`), so `liveError === error` while the live check fails.

- [ ] **Step 1: The failing test.** Append to `tests/v-track-final.test.ts` exactly this block (a file tool):

```ts

test("a live field's polite region reads only its live check; a save's or the server's error is read once, by focus (v-track final task 3, VF3)", () => {
  const field = read(`${C}ui/field.tsx`)
  assert.match(field, /\n {2}liveError\?: string \| null\n/)
  assert.ok(field.includes('{liveError !== undefined ? <span data-slot="field-error-live" className="sr-only" aria-live="polite">{liveError}</span> : null}'), "the region holds the live text only")
  assert.ok(field.includes("{error ? <FieldError id={errorId} aria-hidden={(liveError && liveError === error) || undefined}>{error}</FieldError> : null}"), "the line is hidden from reading only while the region holds it")
  assert.doesNotMatch(field, /aria-live="polite">\{error\}/)
  // Every caller passes its live check's own text (null while it finds nothing), never the shown error.
  const sources = readSourceFiles("src")
  assert.deepEqual(findMatches(sources, /\bliveError(?=[\s>])/g, (path) => path === `${C}ui/field.tsx`), [], "no liveError without a value")
  assert.deepEqual(countMatchesByFile(sources, /\bliveError=\{/g), {
    [`${C}admin/depreciation-policy-builder.tsx`]: 1,
    [`${C}admin/system-settings-form.tsx`]: 25,
    [`${C}assets/asset-batch-form.tsx`]: 4,
    [`${C}assets/asset-form.tsx`]: 2,
  })
  const assetForm = read(`${C}assets/asset-form.tsx`)
  assert.match(assetForm, /liveError=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : null\}\n\s+error=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : errorText\("assetTag"\)\}/)
  assert.match(assetForm, /liveError=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : null\}\n\s+error=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : errorText\("serialNumber"\)\}/)
  const batch = read(`${C}assets/asset-batch-form.tsx`)
  assert.ok(batch.includes('const rowLiveError = (index: number, field: RowField) => (liveDuplicates[rowKey(index, field)] ? t("batchRowDuplicate") : null)'))
  for (const view of ["card", "row"]) {
    for (const name of ["assetTag", "serialNumber"]) {
      assert.match(batch, new RegExp(`id=\\{rowFieldId\\(index, "${name}", "${view}"\\)\\}[^\\n]* liveError=\\{rowLiveError\\(index, "${name}"\\)\\} error=\\{rowError\\(index, "${name}"\\)\\}>`), `${view} ${name}`)
    }
  }
  const form = read(`${C}admin/system-settings-form.tsx`)
  assert.match(form, /const settingLiveError = \(key: string\) => \{\n\s+const code = liveErrors\[settingFieldKey\(key\)\]\n\s+if \(!code\) return null\n\s+return code === "invalidPrefix" \? labels\.invalidPrefix : validationMessage\(code, settingControlParams\[key\]\)\n\s+\}/)
  // Each live setting names its key twice: the error it shows and its live text.
  const sites = [...form.matchAll(/error=\{settingError\(([^)]+)\)\} liveError=\{settingLiveError\(([^)]+)\)\}>/g)]
  assert.equal(sites.length, 15)
  for (const [, shown, live] of sites) assert.equal(live, shown)
  assert.ok(form.includes("errorFor={settingError}\n                liveErrorFor={settingLiveError}"))
  assert.ok(form.includes("jsonLiveError={settingLiveError(depreciationPolicySettingKey)}"))
  assert.ok(form.includes('<Field label={labels.prefix} required error={prefixEditorError("prefix")} liveError={prefixLiveCode ? labels.invalidPrefix : null}>'))
  const panel = form.slice(form.indexOf("function LabelTemplatePanel("), form.indexOf("function LabelPreviewPanel("))
  assert.match(panel, /\n {2}liveErrorFor\?: \(key: string\) => string \| null\n/)
  for (const suffix of ["width_mm", "height_mm", "qr_size", "margin_mm", "gap_mm", "layout", "primary_template", "secondary_template", "tertiary_template"]) {
    assert.ok(panel.includes(`error={errorFor?.(\`\${prefix}_${suffix}\`)} liveError={liveErrorFor?.(\`\${prefix}_${suffix}\`)}>`), suffix)
  }
  const builder = read(`${C}admin/depreciation-policy-builder.tsx`)
  assert.match(builder, /\n {2}jsonLiveError\?: string \| null\n/)
  assert.match(builder, /error=\{jsonError\}\n\s+liveError=\{jsonLiveError\}\n\s+className="mt-3"/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-final.test.ts`. Expected: 3 tests, 1 fail: "a live field's polite region reads only its live check; a save's or the server's error is read once, by focus (v-track final task 3, VF3)" (`AssertionError [ERR_ASSERTION]: The input did not match the regular expression /\n {2}liveError\?: string \| null\n/`: `field.tsx:22` is `liveError?: boolean`).
- [ ] **Step 3: Implement** (exact; the Edit tool keeps each file's CRLF). `field.tsx` first, then the callers:

- `src/components/ui/field.tsx`, edit 1 of 2. Old:

```tsx
  // For an error a check shows while the person types (spec U8): a polite live region reads each new error once. Errors
  // shown by a submit are read through focus and aria-describedby.
  liveError?: boolean
```

  New:

```tsx
  // The text a check shows while the person types (spec U8), or null while it finds nothing. A field with such a check
  // always passes it, so its polite live region is there before the first error and reads each new text once. An error
  // that a save or the server set is not passed here: focus reads it once, through aria-describedby (v-track final
  // task 3). While the check finds something, error shows the same text.
  liveError?: string | null
```

- `src/components/ui/field.tsx`, edit 2 of 2. Old:

```tsx
      {error ? <FieldError id={errorId} aria-hidden={liveError || undefined}>{error}</FieldError> : null}
      {liveError ? <span data-slot="field-error-live" className="sr-only" aria-live="polite">{error}</span> : null}
```

  New:

```tsx
      {error ? <FieldError id={errorId} aria-hidden={(liveError && liveError === error) || undefined}>{error}</FieldError> : null}
      {liveError !== undefined ? <span data-slot="field-error-live" className="sr-only" aria-live="polite">{liveError}</span> : null}
```

- `src/components/assets/asset-form.tsx`, edit 1 of 2. Old:

```tsx
            id="asset-tag"
            liveError
```

  New:

```tsx
            id="asset-tag"
            liveError={duplicateState.assetTagExists ? t("duplicateAssetTag") : null}
```

- `src/components/assets/asset-form.tsx`, edit 2 of 2. Old:

```tsx
            id="asset-serial-number"
            liveError
```

  New:

```tsx
            id="asset-serial-number"
            liveError={duplicateState.serialNumberExists ? t("duplicateSerialNumber") : null}
```

- `src/components/assets/asset-batch-form.tsx`, edit 1 of 5. Old:

```tsx
  const rowError = (index: number, field: RowField) =>
    liveDuplicates[rowKey(index, field)] ? t("batchRowDuplicate") : fieldErrors.message(rowKey(index, field))
```

  New:

```tsx
  const rowError = (index: number, field: RowField) =>
    liveDuplicates[rowKey(index, field)] ? t("batchRowDuplicate") : fieldErrors.message(rowKey(index, field))
  // Only the live duplicate's text, for the row field's polite region; a save's error is read once, by focus (v-track
  // final task 3).
  const rowLiveError = (index: number, field: RowField) => (liveDuplicates[rowKey(index, field)] ? t("batchRowDuplicate") : null)
```

- `src/components/assets/asset-batch-form.tsx`, edit 2 of 5. Old:

```tsx
id={rowFieldId(index, "assetTag", "card")} hint={t("batchAssetTagHelp")} liveError error={rowError(index, "assetTag")}>
```

  New:

```tsx
id={rowFieldId(index, "assetTag", "card")} hint={t("batchAssetTagHelp")} liveError={rowLiveError(index, "assetTag")} error={rowError(index, "assetTag")}>
```

- `src/components/assets/asset-batch-form.tsx`, edit 3 of 5. Old:

```tsx
id={rowFieldId(index, "serialNumber", "card")} hint={t("batchPasteSerialHint")} liveError error={rowError(index, "serialNumber")}>
```

  New:

```tsx
id={rowFieldId(index, "serialNumber", "card")} hint={t("batchPasteSerialHint")} liveError={rowLiveError(index, "serialNumber")} error={rowError(index, "serialNumber")}>
```

- `src/components/assets/asset-batch-form.tsx`, edit 4 of 5. Old:

```tsx
id={rowFieldId(index, "assetTag", "row")} hideLabel hint={t("batchAssetTagHelp")} liveError error={rowError(index, "assetTag")}>
```

  New:

```tsx
id={rowFieldId(index, "assetTag", "row")} hideLabel hint={t("batchAssetTagHelp")} liveError={rowLiveError(index, "assetTag")} error={rowError(index, "assetTag")}>
```

- `src/components/assets/asset-batch-form.tsx`, edit 5 of 5. Old:

```tsx
id={rowFieldId(index, "serialNumber", "row")} hideLabel hint={t("batchPasteSerialHint")} liveError error={rowError(index, "serialNumber")}>
```

  New:

```tsx
id={rowFieldId(index, "serialNumber", "row")} hideLabel hint={t("batchPasteSerialHint")} liveError={rowLiveError(index, "serialNumber")} error={rowError(index, "serialNumber")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 1 of 30. Old:

```tsx
    return code === "invalidPrefix" ? labels.invalidPrefix : validationMessage(code, settingControlParams[key])
  }
  const prefixGroupsError = settingError(assetTagCategoryPrefixesKey)
```

  New:

```tsx
    return code === "invalidPrefix" ? labels.invalidPrefix : validationMessage(code, settingControlParams[key])
  }
  // Only the live rule's text, or null: the field's polite region reads it while the person types. An error the last
  // save or the server found is not here, so focus reads it once (v-track final task 3).
  const settingLiveError = (key: string) => {
    const code = liveErrors[settingFieldKey(key)]
    if (!code) return null
    return code === "invalidPrefix" ? labels.invalidPrefix : validationMessage(code, settingControlParams[key])
  }
  const prefixGroupsError = settingError(assetTagCategoryPrefixesKey)
```

- `src/components/admin/system-settings-form.tsx`, edit 2 of 30. Old:

```tsx
 error={settingError(assetTagFormatTemplateKey)} liveError>
```

  New:

```tsx
 error={settingError(assetTagFormatTemplateKey)} liveError={settingLiveError(assetTagFormatTemplateKey)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 3 of 30. Old:

```tsx
 error={settingError(assetQrPublicBaseUrlKey)} liveError>
```

  New:

```tsx
 error={settingError(assetQrPublicBaseUrlKey)} liveError={settingLiveError(assetQrPublicBaseUrlKey)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 4 of 30. Old:

```tsx
 error={settingError(checkoutDocumentTemplateKey)} liveError>
```

  New:

```tsx
 error={settingError(checkoutDocumentTemplateKey)} liveError={settingLiveError(checkoutDocumentTemplateKey)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 5 of 30. Old:

```tsx
 error={settingError(checkinDocumentTemplateKey)} liveError>
```

  New:

```tsx
 error={settingError(checkinDocumentTemplateKey)} liveError={settingLiveError(checkinDocumentTemplateKey)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 6 of 30. Old:

```tsx
 error={settingError(operationDocumentRunningDigitsKey)} liveError>
```

  New:

```tsx
 error={settingError(operationDocumentRunningDigitsKey)} liveError={settingLiveError(operationDocumentRunningDigitsKey)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 7 of 30. Old:

```tsx
 error={settingError(notificationReturnDueSoonDaysKey)} liveError>
```

  New:

```tsx
 error={settingError(notificationReturnDueSoonDaysKey)} liveError={settingLiveError(notificationReturnDueSoonDaysKey)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 8 of 30. Old:

```tsx
 error={settingError(notificationAuditActionDueSoonDaysKey)} liveError>
```

  New:

```tsx
 error={settingError(notificationAuditActionDueSoonDaysKey)} liveError={settingLiveError(notificationAuditActionDueSoonDaysKey)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 9 of 30. Old:

```tsx
 error={settingError(notificationWarrantyExpiryDaysKey)} liveError>
```

  New:

```tsx
 error={settingError(notificationWarrantyExpiryDaysKey)} liveError={settingLiveError(notificationWarrantyExpiryDaysKey)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 10 of 30. Old:

```tsx
 error={settingError(notificationLicenseExpiryDaysKey)} liveError>
```

  New:

```tsx
 error={settingError(notificationLicenseExpiryDaysKey)} liveError={settingLiveError(notificationLicenseExpiryDaysKey)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 11 of 30. Old:

```tsx
 error={settingError(workflowApprovalMinApproversKey)} liveError>
```

  New:

```tsx
 error={settingError(workflowApprovalMinApproversKey)} liveError={settingLiveError(workflowApprovalMinApproversKey)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 12 of 30. Old:

```tsx
 error={settingError(workflowApprovalSlaDaysKey)} liveError>
```

  New:

```tsx
 error={settingError(workflowApprovalSlaDaysKey)} liveError={settingLiveError(workflowApprovalSlaDaysKey)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 13 of 30. Old:

```tsx
 error={settingError(retentionAttachmentDaysKey)} liveError>
```

  New:

```tsx
 error={settingError(retentionAttachmentDaysKey)} liveError={settingLiveError(retentionAttachmentDaysKey)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 14 of 30. Old:

```tsx
 error={settingError(retentionAuditLogDaysKey)} liveError>
```

  New:

```tsx
 error={settingError(retentionAuditLogDaysKey)} liveError={settingLiveError(retentionAuditLogDaysKey)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 15 of 30. Old:

```tsx
 error={settingError(retentionOrphanFileDaysKey)} liveError>
```

  New:

```tsx
 error={settingError(retentionOrphanFileDaysKey)} liveError={settingLiveError(retentionOrphanFileDaysKey)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 16 of 30. Old:

```tsx
 error={settingError("ldap_sync_schedule")} liveError>
```

  New:

```tsx
 error={settingError("ldap_sync_schedule")} liveError={settingLiveError("ldap_sync_schedule")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 17 of 30. Old:

```tsx
                errorFor={settingError}
```

  New:

```tsx
                errorFor={settingError}
                liveErrorFor={settingLiveError}
```

- `src/components/admin/system-settings-form.tsx`, edit 18 of 30. Old:

```tsx
                  <Field label={labels.prefix} required error={prefixEditorError("prefix")} liveError>
```

  New:

```tsx
                  <Field label={labels.prefix} required error={prefixEditorError("prefix")} liveError={prefixLiveCode ? labels.invalidPrefix : null}>
```

- `src/components/admin/system-settings-form.tsx`, edit 19 of 30. Old:

```tsx
              jsonError={settingError(depreciationPolicySettingKey)}
```

  New:

```tsx
              jsonError={settingError(depreciationPolicySettingKey)}
              jsonLiveError={settingLiveError(depreciationPolicySettingKey)}
```

- `src/components/admin/system-settings-form.tsx`, edit 20 of 30. Old:

```tsx
  setValue,
  errorFor,
}: {
```

  New:

```tsx
  setValue,
  errorFor,
  liveErrorFor,
}: {
```

- `src/components/admin/system-settings-form.tsx`, edit 21 of 30. Old:

```tsx
  errorFor?: (key: string) => string | undefined
}) {
```

  New:

```tsx
  errorFor?: (key: string) => string | undefined
  // Only the live rule's text, or null, for the field's polite region; a save's error is read once, by focus (v-track
  // final task 3).
  liveErrorFor?: (key: string) => string | null
}) {
```

- `src/components/admin/system-settings-form.tsx`, edit 22 of 30. Old:

```tsx
error={errorFor?.(`${prefix}_width_mm`)} liveError>
```

  New:

```tsx
error={errorFor?.(`${prefix}_width_mm`)} liveError={liveErrorFor?.(`${prefix}_width_mm`)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 23 of 30. Old:

```tsx
error={errorFor?.(`${prefix}_height_mm`)} liveError>
```

  New:

```tsx
error={errorFor?.(`${prefix}_height_mm`)} liveError={liveErrorFor?.(`${prefix}_height_mm`)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 24 of 30. Old:

```tsx
error={errorFor?.(`${prefix}_qr_size`)} liveError>
```

  New:

```tsx
error={errorFor?.(`${prefix}_qr_size`)} liveError={liveErrorFor?.(`${prefix}_qr_size`)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 25 of 30. Old:

```tsx
error={errorFor?.(`${prefix}_margin_mm`)} liveError>
```

  New:

```tsx
error={errorFor?.(`${prefix}_margin_mm`)} liveError={liveErrorFor?.(`${prefix}_margin_mm`)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 26 of 30. Old:

```tsx
error={errorFor?.(`${prefix}_gap_mm`)} liveError>
```

  New:

```tsx
error={errorFor?.(`${prefix}_gap_mm`)} liveError={liveErrorFor?.(`${prefix}_gap_mm`)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 27 of 30. Old:

```tsx
error={errorFor?.(`${prefix}_layout`)} liveError>
```

  New:

```tsx
error={errorFor?.(`${prefix}_layout`)} liveError={liveErrorFor?.(`${prefix}_layout`)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 28 of 30. Old:

```tsx
error={errorFor?.(`${prefix}_primary_template`)} liveError>
```

  New:

```tsx
error={errorFor?.(`${prefix}_primary_template`)} liveError={liveErrorFor?.(`${prefix}_primary_template`)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 29 of 30. Old:

```tsx
error={errorFor?.(`${prefix}_secondary_template`)} liveError>
```

  New:

```tsx
error={errorFor?.(`${prefix}_secondary_template`)} liveError={liveErrorFor?.(`${prefix}_secondary_template`)}>
```

- `src/components/admin/system-settings-form.tsx`, edit 30 of 30. Old:

```tsx
error={errorFor?.(`${prefix}_tertiary_template`)} liveError>
```

  New:

```tsx
error={errorFor?.(`${prefix}_tertiary_template`)} liveError={liveErrorFor?.(`${prefix}_tertiary_template`)}>
```

- `src/components/admin/depreciation-policy-builder.tsx`, edit 1 of 3. Old:

```tsx
  jsonError?: React.ReactNode
}
```

  New:

```tsx
  jsonError?: React.ReactNode
  // The text of that rule while the JSON breaks it, or null, for the JSON field's polite region; a save's error is read
  // once, by focus (v-track final task 3).
  jsonLiveError?: string | null
}
```

- `src/components/admin/depreciation-policy-builder.tsx`, edit 2 of 3. Old:

```tsx
export function DepreciationPolicyBuilder({ categories, policyJson, labels, onPolicyJsonChange, jsonId, jsonError }: DepreciationPolicyBuilderProps) {
```

  New:

```tsx
export function DepreciationPolicyBuilder({ categories, policyJson, labels, onPolicyJsonChange, jsonId, jsonError, jsonLiveError }: DepreciationPolicyBuilderProps) {
```

- `src/components/admin/depreciation-policy-builder.tsx`, edit 3 of 3. Old:

```tsx
          error={jsonError}
          liveError
```

  New:

```tsx
          error={jsonError}
          liveError={jsonLiveError}
```

  After Step 3 and before Step 4, `npm test` fails exactly these 7 tests (each pins a bare `liveError` or the old region): "errors shown by a submit are read once, through focus, and a live error keeps a polite announcement (V spec §7.3, G5, U8)" (`v-track-f:197–203`); "asset form: the duplicate tag and serial errors belong to their fields (K4 a)" (`asset-forms-ui:26–27`); "asset batch form: row fields are named by Field and their help, not by aria-label help text (K20)" (`asset-forms-ui:69–71`); "asset form: validate() restates every rule the toasts said, the save gates name their reason, and the warranty pair holds (v-track A1)" (`v-track2-a:128–129`); "asset batch form: shared fields and rows show their errors, duplicates stay live under the rows, and a refusal leaves the review (v-track A2)" (`v-track2-a:193`); "a switch, the label's name choice, each label field and the depreciation JSON take an id and an error (v-track plan 3 task 2, ST2)" (`v-track3:179`, `:183`, `:186`); "the prefix editor checks its prefix and its categories on save, its save is enabled, and the form is a V form (v-track plan 3 task 4, ST4)" (`v-track3:305`). `tests/field-primitives.test.ts:170` (the `Field` signature), `tests/settings-depreciation-policy-ui.test.ts:70` and plan 3's ST3 settings pins (`v-track3:260–264`, `:271–272`) still pass: the prop keeps its name, and `error={settingError(KEY)} liveError` is still a substring of each live site. Step 4 is the edits.
- [ ] **Step 4: Pin edits** (exact; each old string occurs once):

- `tests/v-track-f.test.ts`, edit 1 of 1. Old:

```ts
  // A check that runs while typing (the asset form's duplicate tag and serial, spec U8) passes liveError: a polite live
  // region that is always there reads each new error once; the visible line is hidden from reading so it is not read twice.
  assert.match(field, /liveError\?: boolean/)
  assert.match(field, /\{liveError \? <span data-slot="field-error-live" className="sr-only" aria-live="polite">\{error\}<\/span> : null\}/)
  assert.match(field, /\{error \? <FieldError id=\{errorId\} aria-hidden=\{liveError \|\| undefined\}>\{error\}<\/FieldError> : null\}/)
  const assetForm = read("src/components/assets/asset-form.tsx")
  // v-track plan 2 A1: a save's other error of these fields shows in the same place (errorText).
  assert.match(assetForm, /id="asset-tag"\n\s+liveError\n\s+error=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : errorText\("assetTag"\)\}/)
  assert.match(assetForm, /liveError\n\s+error=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : errorText\("serialNumber"\)\}/)
```

  New:

```ts
  // A check that runs while typing (the asset form's duplicate tag and serial, spec U8) passes its own text as liveError
  // (null while it finds nothing): a polite live region that is always there reads each new one once. A save's or the
  // server's error never goes into it, so focus reads it once (v-track final task 3); the visible line is hidden from
  // reading only while the region holds the same text.
  assert.match(field, /liveError\?: string \| null/)
  assert.match(field, /\{liveError !== undefined \? <span data-slot="field-error-live" className="sr-only" aria-live="polite">\{liveError\}<\/span> : null\}/)
  assert.match(field, /\{error \? <FieldError id=\{errorId\} aria-hidden=\{\(liveError && liveError === error\) \|\| undefined\}>\{error\}<\/FieldError> : null\}/)
  const assetForm = read("src/components/assets/asset-form.tsx")
  // v-track plan 2 A1: a save's other error of these fields shows in the same place (errorText), outside the region.
  assert.match(assetForm, /id="asset-tag"\n\s+liveError=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : null\}\n\s+error=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : errorText\("assetTag"\)\}/)
  assert.match(assetForm, /liveError=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : null\}\n\s+error=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : errorText\("serialNumber"\)\}/)
```

- `tests/asset-forms-ui.test.ts`, edit 1 of 2. Old:

```ts
  assert.match(source, /label=\{t\("assetTag"\)\}\n\s*id="asset-tag"\n\s*liveError\n\s*error=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : errorText\("assetTag"\)\}\n\s*>/)
  assert.match(source, /liveError\n\s*error=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : errorText\("serialNumber"\)\}\n\s*>\n\s*<ScannerTextInput/)
```

  New:

```ts
  // The live region reads only the duplicate check's own text (v-track final task 3).
  assert.match(source, /label=\{t\("assetTag"\)\}\n\s*id="asset-tag"\n\s*liveError=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : null\}\n\s*error=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : errorText\("assetTag"\)\}\n\s*>/)
  assert.match(source, /liveError=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : null\}\n\s*error=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : errorText\("serialNumber"\)\}\n\s*>\n\s*<ScannerTextInput/)
```

- `tests/asset-forms-ui.test.ts`, edit 2 of 2. Old:

```ts
  assert.match(source, /<Field label=\{t\("batchAssetTag"\)\} id=\{rowFieldId\(index, "assetTag", "card"\)\} hint=\{t\("batchAssetTagHelp"\)\} liveError error=\{rowError\(index, "assetTag"\)\}>/)
  assert.match(source, /<Field label=\{t\("batchAssetTag"\)\} id=\{rowFieldId\(index, "assetTag", "row"\)\} hideLabel hint=\{t\("batchAssetTagHelp"\)\} liveError error=\{rowError\(index, "assetTag"\)\}>/)
  assert.match(source, /<Field label=\{t\("batchSerialNumber"\)\} id=\{rowFieldId\(index, "serialNumber", "row"\)\} hideLabel hint=\{t\("batchPasteSerialHint"\)\} liveError error=\{rowError\(index, "serialNumber"\)\}>\n\s*<ScannerTextInput /)
```

  New:

```ts
  assert.match(source, /<Field label=\{t\("batchAssetTag"\)\} id=\{rowFieldId\(index, "assetTag", "card"\)\} hint=\{t\("batchAssetTagHelp"\)\} liveError=\{rowLiveError\(index, "assetTag"\)\} error=\{rowError\(index, "assetTag"\)\}>/)
  assert.match(source, /<Field label=\{t\("batchAssetTag"\)\} id=\{rowFieldId\(index, "assetTag", "row"\)\} hideLabel hint=\{t\("batchAssetTagHelp"\)\} liveError=\{rowLiveError\(index, "assetTag"\)\} error=\{rowError\(index, "assetTag"\)\}>/)
  assert.match(source, /<Field label=\{t\("batchSerialNumber"\)\} id=\{rowFieldId\(index, "serialNumber", "row"\)\} hideLabel hint=\{t\("batchPasteSerialHint"\)\} liveError=\{rowLiveError\(index, "serialNumber"\)\} error=\{rowError\(index, "serialNumber"\)\}>\n\s*<ScannerTextInput /)
```

- `tests/v-track2-a.test.ts`, edit 1 of 2. Old:

```ts
  assert.match(source, /liveError\n\s+error=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : errorText\("assetTag"\)\}/)
  assert.match(source, /liveError\n\s+error=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : errorText\("serialNumber"\)\}/)
```

  New:

```ts
  assert.match(source, /liveError=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : null\}\n\s+error=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : errorText\("assetTag"\)\}/)
  assert.match(source, /liveError=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : null\}\n\s+error=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : errorText\("serialNumber"\)\}/)
```

- `tests/v-track2-a.test.ts`, edit 2 of 2. Old:

```ts
      assert.match(source, new RegExp(`id=\\{rowFieldId\\(index, "${field}", "${view}"\\)\\}[^\\n]* liveError error=\\{rowError\\(index, "${field}"\\)\\}>`), `${view} ${field}`)
```

  New:

```ts
      assert.match(source, new RegExp(`id=\\{rowFieldId\\(index, "${field}", "${view}"\\)\\}[^\\n]* liveError=\\{rowLiveError\\(index, "${field}"\\)\\} error=\\{rowError\\(index, "${field}"\\)\\}>`), `${view} ${field}`)
```

- `tests/v-track3.test.ts`, edit 1 of 4. Old:

```ts
    assert.ok(panel.includes(`error={errorFor?.(\`\${prefix}_${suffix}\`)} liveError>`), suffix)
```

  New:

```ts
    assert.ok(panel.includes(`error={errorFor?.(\`\${prefix}_${suffix}\`)} liveError={liveErrorFor?.(\`\${prefix}_${suffix}\`)}>`), suffix)
```

- `tests/v-track3.test.ts`, edit 2 of 4. Old:

```ts
  assert.match(builder, /export function DepreciationPolicyBuilder\(\{ categories, policyJson, labels, onPolicyJsonChange, jsonId, jsonError \}: DepreciationPolicyBuilderProps\) \{/)
```

  New:

```ts
  assert.match(builder, /export function DepreciationPolicyBuilder\(\{ categories, policyJson, labels, onPolicyJsonChange, jsonId, jsonError, jsonLiveError \}: DepreciationPolicyBuilderProps\) \{/)
```

- `tests/v-track3.test.ts`, edit 3 of 4. Old:

```ts
  assert.match(builder, /hint=\{labels\.depreciationAdvancedJsonDescription\}\n\s+id=\{jsonId\}\n\s+error=\{jsonError\}\n\s+liveError\n\s+className="mt-3"\n\s+>\n\s+<Textarea value=\{policyJson\}/)
```

  New:

```ts
  assert.match(builder, /hint=\{labels\.depreciationAdvancedJsonDescription\}\n\s+id=\{jsonId\}\n\s+error=\{jsonError\}\n\s+liveError=\{jsonLiveError\}\n\s+className="mt-3"\n\s+>\n\s+<Textarea value=\{policyJson\}/)
```

- `tests/v-track3.test.ts`, edit 4 of 4. Old:

```ts
  assert.match(form, /<Field label=\{labels\.prefix\} required error=\{prefixEditorError\("prefix"\)\} liveError>/)
```

  New:

```ts
  assert.match(form, /<Field label=\{labels\.prefix\} required error=\{prefixEditorError\("prefix"\)\} liveError=\{prefixLiveCode \? labels\.invalidPrefix : null\}>/)
```

- [ ] **Step 5: Verify.** `node --test tests/v-track-final.test.ts tests/v-track-f.test.ts tests/asset-forms-ui.test.ts tests/v-track2-a.test.ts tests/v-track3.test.ts tests/field-primitives.test.ts tests/settings-depreciation-policy-ui.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts` (0 fail); `npm test` (+1; **2308 tests, 2307 pass, 0 fail, 1 skipped**); `npx tsc --noEmit`; `npm run lint` (0 errors). `node <tools>/eol.mjs src/components/ui/field.tsx src/components/assets/asset-form.tsx src/components/assets/asset-batch-form.tsx src/components/admin/system-settings-form.tsx src/components/admin/depreciation-policy-builder.tsx tests/v-track-f.test.ts tests/asset-forms-ui.test.ts tests/v-track-final.test.ts` prints `111 111`, `2076 2076`, `1347 1347`, `2653 2653`, `451 451`, `251 251`, `140 140` and `0 119`; `node <tools>/eol.mjs tests/v-track2-a.test.ts tests/v-track3.test.ts` prints `312 312` and `368 368`.
- [ ] **Step 6: Commit.** `git add src/components/ui/field.tsx src/components/assets/asset-form.tsx src/components/assets/asset-batch-form.tsx src/components/admin/system-settings-form.tsx src/components/admin/depreciation-policy-builder.tsx tests/v-track-f.test.ts tests/asset-forms-ui.test.ts tests/v-track2-a.test.ts tests/v-track3.test.ts tests/v-track-final.test.ts`, then `git commit -m "fix(ui): a live field's polite region reads only its live check, so a save's error is read once (v-track final task 3, VF3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 4 (VF4): The form-error rule in the design docs (`DESIGN.md`, docs/14, `.impeccable/design.json`, three guard comments)

Spec §9 item 4 ("`DESIGN.md` (the form error rule replaces "toast for validation"), docs/14, `.impeccable/design.json`"); the user's scope item 1 of 2026-10-19; VF-R5.

**Files:**
- Modify: `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `.impeccable/design.json`, `tests/form-migration-guards.test.ts`, `tests/asset-status-correction-ui.test.ts`, `tests/validation-guards.test.ts` (all `i/lf w/crlf`; the three test files: comments only)
- Test: `tests/v-track-final.test.ts` (LF, append)
- Read before writing: `tests/phase2d-docs.test.ts` and `tests/dark-mode-docs.test.ts` (the phrases they pin stay; VF-R5).

**Interfaces:**
- Consumes: Tasks 1–3 as committed (the docs name `wholeNumber`, `notWholeNumber`, the `liveError` text, the print queue's gates as built).
- Produces: `DESIGN.md` `### Forms: Errors Under the Field` (with **The Error Under the Field Rule.**); docs/14's "A form's errors" row, its V guards paragraph, its "Form errors" registry row and QA line; design.json's gate, error line, Do and Don't.

**Changes at 71a9e95c** (the exact edits below; line numbers of `71a9e95c`):

| File:line | Says today | Becomes | Rule |
|---|---|---|---|
| `DESIGN.md:197` overview | phases 1, 2A–2D, Dark Mode | + one sentence on the V track | VF-R5 |
| `DESIGN.md:339` The Thai Copy Rule | a failed validation gets "one fixed answer" `{ error, code }` | the 400 body with `fieldErrors`, shown under the field; the fixed sentence only when no shown field is named | spec §6.1, U3 |
| `DESIGN.md:393` Disabled | `aria-disabled` for `asChild` links and busy buttons | and the prerequisite gates (focusable, with their reason); the pinned "no `disabled:opacity-*` in `src`" stays | §4.4 |
| `DESIGN.md:394` Busy | "`disabled` may hold other conditions, such as a validation gate" | never a typed rule, never a prerequisite the person can meet; GB4's sentence stays | §4.4 |
| `DESIGN.md:432` dialog Errors | every action error is a Notice | a field's error under its field; the Notice for a refusal that names no field; the review dialog closes first | U1, §4.1.3, §4.2 |
| `DESIGN.md:443` Command lists | the panel only | the trigger's invalid look, `id`, `error` | §7.3 |
| `DESIGN.md:449` Toasts | look only | never a field's error (V3) | U2 |
| `DESIGN.md:454` live regions | `role="alert"` for "a save … failed" | a form-level failure; never a field's error | G5 |
| `DESIGN.md:477` `Field` | `role="alert"`; "in many forms they are the only check"; "three … stars … until the V track"; "the rest come with the V track" | no alert role; why the attributes stay; GF4's V-track rule and `STAR_ONLY` empty; every form's errors under its fields | F-R6, §4.5 |
| `DESIGN.md:478` groups | hand-written `<fieldset>` | and `FieldGroup` | §7.3 |
| `DESIGN.md:518–520` | — | `### Forms: Errors Under the Field` before `### Navigation` | VF-R5 |
| `DESIGN.md:598` scan check save | "disabled with the reason shown" | `aria-disabled` with `audit-check-photo-reason` | §4.4 |
| `DESIGN.md:612`, `:628` | — | one Do, one Don't | VF-R5 |
| `docs/14:57`, `:61`, `:62`, `:66`, `:89`, `:93` | the Button, Field, group, SearchableSelect, toast and dialog rows | the gate; `error`/`liveError`; `FieldGroup`; `id`/`error`; no field error; field errors in dialogs | VF-R5 |
| `docs/14:99` | — | a row "A form's errors" | VF-R5 |
| `docs/14:101` | the guard paragraph | + a paragraph on `tests/validation-guards.test.ts` | VF-R5 |
| `docs/14:121`, `:124` | the 2C row says "one readable validation error"; no V track row | the 2C row points at the new row; a "Form errors" row after Themes | the registry rule (`:107`) |
| `docs/14:137` | — | a QA line | VF-R5 |
| `design.json:3` | `generatedAt` 2026-10-17 | 2026-10-19 | — |
| `design.json:373`, `:389–391`, `:421` | Primary Button, Text Field, Dialog | the gate; an error line (html, css, description); the dialog's field errors | VF-R5 |
| `design.json:574`, `:589` | — | one Do after `dos[5]`, one Don't after `donts[11]` | VF-R5 |
| `tests/form-migration-guards.test.ts:23`, `:52`, `:234`; `tests/asset-status-correction-ui.test.ts:19`; `tests/validation-guards.test.ts:9–10` | comments that wait for the V track | what is true now | VF-R5 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-final.test.ts` exactly this block (a file tool):

```ts

test("the design docs state the form-error rule, and no doc or guard still waits for the V track (v-track final task 4, VF4)", () => {
  const design = read("DESIGN.md")
  const start = design.indexOf("\n### Forms: Errors Under the Field\n")
  assert.ok(start > design.indexOf("\n### Forms: Save Bar, Steps, Sections and Signature\n"), "DESIGN.md §5 holds the rule after the forms section")
  const section = design.slice(start, design.indexOf("\n### Navigation\n"))
  assert.ok(section.startsWith("\n### Forms: Errors Under the Field\n\n**The Error Under the Field Rule.** "), "the rule opens the section")
  for (const phrase of ["`noValidate`", "`validate()`", "`useFieldErrors`", "`focusFirst(order, { idFor, reveal })`", "`waitForDialogToClose`", "`fieldErrors`", "Guard V3", "`aria-disabled`", "`aria-describedby`", "`Field liveError`", "**One announcement per save:**", "`notWholeNumber`", "`FieldGroup`", "never in a box of its own"]) {
    assert.ok(section.includes(phrase), `the section names ${phrase}`)
  }
  // The clauses the V track made untrue are gone, and the rest of DESIGN.md points at the rule.
  assert.doesNotMatch(design, /one fixed answer|`role="alert"`, under the hint|until the V track|the rest come with the V track|in many forms they are the only check|such as a validation gate|disabled with the reason shown/)
  assert.match(design, /The V track \(spec `docs\/superpowers\/specs\/2026-10-17-v-track-field-errors-design\.md`, four plans\)/, "the overview")
  assert.ok(design.includes('`{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors }`'), "the Thai Copy Rule")
  assert.match(design, /\n- \*\*Do\*\* check a form on save /)
  assert.match(design, /\n- \*\*Don't\*\* show a field's error in a toast /)
  // docs/14: the rows, the guard paragraph, the registry row and the QA line.
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  assert.match(index, /\n\| A form's errors \| `useFieldErrors`/)
  assert.ok(index.includes("a prerequisite gate is `aria-disabled` with `aria-describedby` to its visible reason"), "the Button row")
  assert.ok(index.includes("\n\n`tests/validation-guards.test.ts` holds the V track"), "the V guards")
  assert.match(index, /\n\| Form errors \| \[`2026-10-17-v-track-field-errors-design\.md`\]\(superpowers\/specs\/2026-10-17-v-track-field-errors-design\.md\)/)
  assert.ok(index.includes("[`2026-10-19-v-track-final.md`](superpowers/plans/2026-10-19-v-track-final.md)"), "the registry names the final plan")
  assert.match(index, /\n- Save each form empty and with a wrong value: /)
  // .impeccable/design.json: the gate, the error line, one Do and one Don't; no new narrative rule (its schema's sections
  // are colors, typography and elevation).
  type Design = {
    components: Array<{ name: string; description: string; html: string; css: string }>
    narrative: { rules: Array<{ section: string }>; dos: string[]; donts: string[] }
  }
  const json = JSON.parse(readFileSync(".impeccable/design.json", "utf8")) as Design
  const component = (name: string) => json.components.find((entry) => entry.name === name) ?? { name, description: "", html: "", css: "" }
  assert.match(component("Primary Button").description, /A prerequisite gate is aria-disabled: it keeps focus/)
  assert.ok(component("Text Field").html.includes('aria-describedby="ds-asset-tag-error ds-asset-tag-hint"'))
  assert.ok(component("Text Field").html.includes('<p class="ds-field-error" id="ds-asset-tag-error">'))
  assert.ok(component("Text Field").css.includes(".ds-field-error { margin: 0; font-size: 13px; line-height: 1.5385; color: #B3261E; }"))
  assert.match(component("Dialog").description, /A field's error shows under its field in the body/)
  assert.ok(json.narrative.dos.some((entry) => entry.startsWith("Do check a form on save")))
  assert.ok(json.narrative.donts.some((entry) => entry.startsWith("Don't show a field's error in a toast")))
  assert.deepEqual([...new Set(json.narrative.rules.map((entry) => entry.section))].sort(), ["colors", "elevation", "typography"])
  // The guards and pins no longer say the V track is still to come.
  for (const path of ["tests/form-migration-guards.test.ts", "tests/asset-status-correction-ui.test.ts", "tests/validation-guards.test.ts"]) {
    assert.doesNotMatch(read(path), /wait for the V track|the V track removes it|The V track adds required|until the V track|the V track ends with/, path)
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-final.test.ts`. Expected: 4 tests, 1 fail: "the design docs state the form-error rule, and no doc or guard still waits for the V track (v-track final task 4, VF4)" (`AssertionError [ERR_ASSERTION]: DESIGN.md §5 holds the rule after the forms section`: there is no `### Forms: Errors Under the Field`, so its index is −1).
- [ ] **Step 3: Implement** (exact; the Edit tool keeps each file's CRLF; `.impeccable/design.json`'s old and new strings are its raw JSON text, with `\"` as written):

- `DESIGN.md`, edit 1 of 16. Old:

```md
paper and print stay light (The Two-Theme Rule in §2).
```

  New:

```md
paper and print stay light (The Two-Theme Rule in §2). The V track (spec `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md`, four plans) moved every form onto errors under the field: a form checks itself on save, shows each error in Thai under its field, takes the person to the first wrong field and reads the server's refusals the same way (**Forms: Errors Under the Field** in §5).
```

- `DESIGN.md`, edit 2 of 16. Old:

```md
A request that fails server validation (a `ZodError`) gets one fixed answer, status 400 with `{ error: "Invalid request data", code: "VALIDATION_FAILED" }`, shown as "ข้อมูลที่กรอกไม่ครบหรือไม่ถูกต้อง ตรวจสอบแล้วลองอีกครั้ง" (`apiErrors.validationFailed`), never the JSON of the zod issues (phase 2C, `validationFailedBody` in `src/lib/api-error-exposure.ts`).
```

  New:

```md
A request that fails server validation (a `ZodError`) answers status 400 with `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors }` (`validationFailedBody` in `src/lib/api-error-exposure.ts`): `fieldErrors` names each failing field by its dotted path (`name`, `rows.3.serialNumber`, `settings.<key>`; `_form` for none) with one code of `src/lib/field-errors.ts` (V track plan 1), and the form shows each in Thai under its field (`common.validation.*`, then the `apiErrors` catalog). A refusal that names no field the form shows falls back to "ข้อมูลที่กรอกไม่ครบหรือไม่ถูกต้อง ตรวจสอบแล้วลองอีกครั้ง" (`apiErrors.validationFailed`); never the JSON of the zod issues.
```

- `DESIGN.md`, edit 3 of 16. Old:

```md
`aria-disabled` also blocks pointer events, for `asChild` links and busy buttons.
```

  New:

```md
`aria-disabled` also blocks pointer events, for `asChild` links, busy buttons and the prerequisite gates of **Forms: Errors Under the Field**, which stay focusable and point at their reason.
```

- `DESIGN.md`, edit 4 of 16. Old:

```md
`disabled` may hold other conditions, such as a validation gate, but never the busy one:
```

  New:

```md
`disabled` may hold another condition, such as another action of the form running, but never the busy one, never a rule about what the person typed (that is an error under the field) and never a prerequisite the person can meet (that is `aria-disabled` with its reason, **Forms: Errors Under the Field**):
```

- `DESIGN.md`, edit 5 of 16. Old:

```md
- **Errors:** an error from the action of an open dialog shows inside the dialog, as the first thing in its body: `<Notice tone="danger" role="alert">`. A modal hides the page behind it from sight and from screen readers, so a message there is lost; the page shows its own error box only while no dialog is open (the integration client edit dialog, 2C plan 4).
```

  New:

```md
- **Errors:** a field's error in an open dialog shows under that field, and the dialog's save focuses it (**Forms: Errors Under the Field**). An error from the dialog's action that names no field it shows (a conflict, a network failure, a refusal of the whole action) shows inside the dialog, as the first thing in its body: `<Notice tone="danger" role="alert">`. A modal hides the page behind it from sight and from screen readers, so a message there is lost; the page shows its own error box only while no dialog is open (the integration client edit dialog, 2C plan 4). A review dialog whose form the server refuses on a field closes first, and then the field takes focus (`reveal` with `waitForDialogToClose` in `src/lib/field-focus.ts`).
```

- `DESIGN.md`, edit 6 of 16. Old:

```md
and only the chosen option shows a check, at the end.
```

  New:

```md
and only the chosen option shows a check, at the end. Its trigger is a button and takes no `aria-invalid`: with `error` it shows the field error look through `data-invalid` (`triggerInvalidClasses`, teal again while focused or open), shows the error under itself tied by `aria-describedby`, and takes a stable `id` so a save can focus it; `MaintenanceOptionSelect` and `AuditScanCheckField` pass `id` and `error` on.
```

- `DESIGN.md`, edit 7 of 16. Old:

```md
check them in the browser again after a sonner upgrade.
```

  New:

```md
check them in the browser again after a sonner upgrade. A toast never says what is wrong with a field (guard V3 in `tests/validation-guards.test.ts`): it is for what no field can show, a network failure, 401 or 403, a 409 conflict, a 5xx or a step after a save that did not finish (an upload).
```

- `DESIGN.md`, edit 8 of 16. Old:

```md
`role="alert"` for an error after the user acted (a save or a login failed);
```

  New:

```md
`role="alert"` for a form-level failure after the user acted (a login failed, a dialog's `Notice` for a refusal that names no field), never for a field's error, which focus reads once (**Forms: Errors Under the Field**);
```

- `DESIGN.md`, edit 9 of 16. Old:

```md
the error (13/20 `text-danger`, `role="alert"`, under the hint) sit below it, and `aria-describedby` reads the error first.
```

  New:

```md
the error (13/20 `text-danger`, under the hint, no alert role) sit below it, and `aria-describedby` reads the error first.
```

- `DESIGN.md`, edit 10 of 16. Old:

```md
(phase 2C ruling K4): in many forms they are the only check, and guard GF5 keeps their count per file from dropping. `Field required` and the control's `required` go together (guard GF4); three server-enforced fields show the star without `required` until the V track.
```

  New:

```md
(phase 2C ruling K4): they bring the phone keyboard and the screen reader's "required", the form's `validate()` restates them because the form has `noValidate`, and guard GF5 keeps their count per file from dropping. `Field required` and the control's `required` go together (guard GF4), except in a form that checks itself (`noValidate` and `validate()`), where the star may stand alone because `validate()` checks the field; `STAR_ONLY` is empty.
```

- `DESIGN.md`, edit 11 of 16. Old:

```md
Errors under fields stay only where they existed before phase 2C (the supplier form, the duplicate asset tag and serial); the rest come with the V track.
```

  New:

```md
Every form shows its errors under its fields (**Forms: Errors Under the Field**): `error` comes from the form's `useFieldErrors`, and `liveError` takes only the text of a check that runs while typing.
```

- `DESIGN.md`, edit 12 of 16. Old:

```md
`<FieldRequiredMark />` for a required group. `min-w-0` stops a fieldset (`min-inline-size: min-content` by default) from pushing a phone page sideways.
```

  New:

```md
`<FieldRequiredMark />` for a required group. `min-w-0` stops a fieldset (`min-inline-size: min-content` by default) from pushing a phone page sideways. A group with a rule is `FieldGroup` (`src/components/ui/field-group.tsx`): that fieldset and legend with a hint and one error under the group, tied by `aria-describedby`; a save focuses its checked radio or first control.
```

- `DESIGN.md`, edit 13 of 16. Old:

```md
  - A `ghost` `sm` "ล้างลายเซ็น" button sits under the canvas on the right.

### Navigation
```

  New:

```md
  - A `ghost` `sm` "ล้างลายเซ็น" button sits under the canvas on the right.

### Forms: Errors Under the Field

**The Error Under the Field Rule.** A form that refuses to save says what is wrong under the field that is wrong, in Thai, and takes the person to it; a refusal of the server looks the same (the V track: spec `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md`, plans 1 to 3 and the final plan).

- **The form checks itself:** `<form onSubmit={handleSubmit} noValidate …>`, with `noValidate` straight after `onSubmit` so the browser's own bubble never hides our errors, and a module-level `validate()` that restates every constraint of its controls through the helpers of `src/lib/validation-rules.ts` (`required`, `minLength`, `maxLength`, `range`, `wholeNumber`, `decimals`, `step`, `email`, `pattern`, `notBefore`, `atLeastOne`), which return codes, not text. The controls keep `required`, `maxLength`, `min`, `max` and `step` for the phone keyboard, the screen reader's "required" and guard GF5. A dialog inside another form has no `<form>` (guard GD5) and calls its own `validate…()` from its save. Guard V2 (`tests/validation-guards.test.ts`) holds every form of `V_SCOPE` to this.
- **Errors under the field, after save:** `useFieldErrors` (`src/components/ui/use-field-errors.ts`) holds the codes, and `Field error={fieldErrors.message(key)}` shows each under its field with the field's error look. A group shows one error under the group (`FieldGroup`); a `SearchableSelect` takes `id` and `error`. A field's error clears when that field changes (a pair or a group clears together, such as an end date with its start date), and a new save checks everything again. Nothing new shows while the person types: only the checks that were live before the V track stay live, and each shows its error in the same place, under its field, never in a box of its own (below).
- **The first wrong field takes focus:** the hook's `focusFirst(order, { idFor, reveal })` takes the form's visual order and focuses the first wrong field, scrolled clear of the topbar and the save bar (`focusField` in `src/lib/field-focus.ts`, which also opens a closed `<details>` around it). `reveal` first brings the field on screen: it switches the settings tab, closes a review dialog (`waitForDialogToClose`) or goes back to the step that holds the field.
- **The server's refusals land on the same fields:** a 400 `VALIDATION_FAILED` (and a 409 duplicate or another field refusal, `src/lib/field-error-response.ts`) carries `fieldErrors` keyed like the form's fields, and the form runs `if (fieldErrors.applyServer(payload) && focusFirstError()) return`. A refusal that names no field the form shows keeps the form's own message, the dialog `Notice` or the toast it used before, so nothing fails silently.
- **Messages:** a code reads `common.validation.<code>` (with `{min}` and `{max}` when the form passes them), then the `apiErrors` catalog for a server rule of its own, then `common.validation.invalid` (`src/lib/field-error-client.ts`). A fraction in a whole-number field reads "กรุณากรอกเป็นจำนวนเต็ม" (`notWholeNumber`), more than two decimals of money "กรอกทศนิยมได้ไม่เกิน 2 ตำแหน่ง" (`tooManyDecimals`).
- **No validation toast:** a toast never says what is wrong with a field. Guard V3 allows a form of `V_FORMS` no `toast.error` or `toast.warning` outside a `catch` but the after-save results of `NON_VALIDATION_TOASTS` (files that did not upload, the asset's follow-up steps).
- **A rule is not a gate:** a rule about what the person typed (empty, too long, out of range, an end before its start) leaves the save enabled and answers with an error under the field. A prerequisite that is not a field (nothing selected, nothing changed, no preview yet, a photo not taken) keeps its gate as `aria-disabled`, with `aria-describedby` pointing at a visible line that says why; the button stays focusable and looks disabled, and its handler returns first, because Enter and Space still reach it. Never a `disabled` button with no reason on screen.
- **One announcement per save:** `FieldError` has no alert role; focus reads the first wrong field with its error (`aria-describedby` reads the error before the hint). A check that runs while typing (the duplicate asset tag and serial, the batch's duplicate rows, the settings rules that showed a box, the prefix editor's prefix, the depreciation JSON) passes its own text as `Field liveError`, `null` while it finds nothing: a polite region that is always there reads each new text once. An error that a save or the server set never goes into that region, so focus reads it once (v-track final task 3).
- **Both themes and forced colors:** the error look is the field's own (`danger` border, `shadow-field-error`, teal again while focused) and the error text is `text-danger`; the words say what is wrong, so nothing relies on color.

### Navigation
```

- `DESIGN.md`, edit 14 of 16. Old:

```md
warning variant when anything differs; disabled with the reason shown when required evidence is missing.
```

  New:

```md
warning variant when anything differs; while a required photo is missing it is `aria-disabled` with its reason tied by `aria-describedby` (`audit-check-photo-reason`), and Enter or Space on it opens the note and photo section.
```

- `DESIGN.md`, edit 15 of 16. Old:

```md
- **Do** support Thai and English text, keyboard navigation, visible focus states, reduced motion, touch-safe mobile/tablet controls, and clear empty, loading, error, permission-denied, and validation states.
```

  New:

```md
- **Do** support Thai and English text, keyboard navigation, visible focus states, reduced motion, touch-safe mobile/tablet controls, and clear empty, loading, error, permission-denied, and validation states.
- **Do** check a form on save (`noValidate` and `validate()`), show each error under its field, take the person to the first wrong field and land the server's `fieldErrors` on the same fields (**Forms: Errors Under the Field**).
```

- `DESIGN.md`, edit 16 of 16. Old:

```md
drop `required` or `maxLength` from a control when it moves into `Field`, or give a dialog its own `<form>` when it renders inside another form.
```

  New:

```md
drop `required` or `maxLength` from a control when it moves into `Field`, or give a dialog its own `<form>` when it renders inside another form.
- **Don't** show a field's error in a toast or the browser's bubble, announce it as an alert, or keep a rule behind a `disabled` button with no reason on screen.
```

- `docs/14_UI_UX_DESIGN_SYSTEM.md`, edit 1 of 11. Old:

```md
a raw `<button>` only in a shared part or an `EXEMPT` row, never a height
```

  New:

```md
a prerequisite gate is `aria-disabled` with `aria-describedby` to its visible reason, and its handler returns first (a rule about what the person typed is no gate); a raw `<button>` only in a shared part or an `EXEMPT` row, never a height
```

- `docs/14_UI_UX_DESIGN_SYSTEM.md`, edit 2 of 11. Old:

```md
a field repeated in every card of a list adds `aria-describedby` with its card's name (K20) |
```

  New:

```md
a field repeated in every card of a list adds `aria-describedby` with its card's name (K20); `error` from the form's `useFieldErrors`; `liveError` takes only the text of a check that runs while typing (`null` while it finds nothing), never a save's error |
```

- `docs/14_UI_UX_DESIGN_SYSTEM.md`, edit 3 of 11. Old:

```md
| A label for a group of checkboxes or radios | `<fieldset className="min-w-0">` with `<legend className={cn(fieldLabelClasses, "mb-1.5")}>` | `<FieldRequiredMark />` for a required group |
```

  New:

```md
| A label for a group of checkboxes or radios | `FieldGroup` (legend, hint, one error under the group, focus to its first control); a group with no rule may stay a `<fieldset className="min-w-0">` with `<legend className={cn(fieldLabelClasses, "mb-1.5")}>` | `required` on `FieldGroup`, or `<FieldRequiredMark />` in a hand-written legend |
```

- `docs/14_UI_UX_DESIGN_SYSTEM.md`, edit 4 of 11. Old:

```md
| A searchable picker | `SearchableSelect` | has its own label, hint and error |
```

  New:

```md
| A searchable picker | `SearchableSelect` | has its own label, hint and error; pass `id` and `error` so a save can focus it and tie its error (its button trigger takes no `aria-invalid`) |
```

- `docs/14_UI_UX_DESIGN_SYSTEM.md`, edit 5 of 11. Old:

```md
| A toast | `toast.*` or `useApiError().toast` | `AppToaster` styles every toast; do not pass `richColors` |
```

  New:

```md
| A toast | `toast.*` or `useApiError().toast` | `AppToaster` styles every toast; do not pass `richColors`; never for a field's error (guard V3), only for what no field can show |
```

- `docs/14_UI_UX_DESIGN_SYSTEM.md`, edit 6 of 11. Old:

```md
an error of the dialog's own action shows in its body as `Notice tone="danger" role="alert"`, not on the page behind it;
```

  New:

```md
a field's error shows under its field in the dialog, and an error of the dialog's own action that names no field shows in its body as `Notice tone="danger" role="alert"`, not on the page behind it;
```

- `docs/14_UI_UX_DESIGN_SYSTEM.md`, edit 7 of 11. Old:

```md
| The record a form is about | `FormContextBanner` | `code` shows a record code as `tag` |
```

  New:

```md
| The record a form is about | `FormContextBanner` | `code` shows a record code as `tag` |
| A form's errors | `useFieldErrors`, a module-level `validate()` with the helpers of `src/lib/validation-rules.ts`, and `noValidate` right after `onSubmit` | errors under the field after save, the first wrong field focused (`reveal` for a tab, a `<details>`, a dialog or a step), the server's `fieldErrors` on the same fields, no validation toast, one announcement per save ([`DESIGN.md`](../DESIGN.md) **Forms: Errors Under the Field**) |
```

- `docs/14_UI_UX_DESIGN_SYSTEM.md`, edit 8 of 11. Old:

```md
apart from their `EXEMPT` rows.
```

  New:

```md
apart from their `EXEMPT` rows.

`tests/validation-guards.test.ts` holds the V track (spec `2026-10-17-v-track-field-errors-design.md`) for every form a person submits: V1 lists them in `V_SCOPE` (51 forms in 44 files), and every file of `V_FORMS`, which equals `V_SCOPE`, checks itself with `noValidate` right after `onSubmit` and a `validate(` (V2), shows no `toast.error` or `toast.warning` outside a `catch` but the after-save results of `NON_VALIDATION_TOASTS` (V3), and gives every required select an `id` and an error (V4; `SELECT_STAR_ONLY` is empty, V5). It is not an `EXEMPT` guard: a new form joins both lists in the commit that adds it.
```

- `docs/14_UI_UX_DESIGN_SYSTEM.md`, edit 9 of 11. Old:

```md
one readable validation error;
```

  New:

```md
one readable validation error, since then errors under the field (the Form errors row);
```

- `docs/14_UI_UX_DESIGN_SYSTEM.md`, edit 10 of 11. Old:

```md
| [`2026-10-17-dark-mode.md`](superpowers/plans/2026-10-17-dark-mode.md) sequences implementation and verification. |
```

  New:

```md
| [`2026-10-17-dark-mode.md`](superpowers/plans/2026-10-17-dark-mode.md) sequences implementation and verification. |
| Form errors | [`2026-10-17-v-track-field-errors-design.md`](superpowers/specs/2026-10-17-v-track-field-errors-design.md) (the V track: errors under the field in every form, the first wrong field focused with the tab, `<details>`, dialog or step brought on screen, the server's `fieldErrors` on every route, no validation toasts, prerequisite gates with a visible reason, one announcement per save; its §2 decisions U1–U9) | [`2026-10-17-v-track-plan1.md`](superpowers/plans/2026-10-17-v-track-plan1.md) sequences plan 1 (the server, the foundation, and the master-data and admin forms); [`2026-10-18-v-track-plan2.md`](superpowers/plans/2026-10-18-v-track-plan2.md) plan 2 (the asset, operation, audit, disposal and maintenance forms); [`2026-10-19-v-track-plan3.md`](superpowers/plans/2026-10-19-v-track-plan3.md) plan 3 (the system settings form and its prefix editor); [`2026-10-19-v-track-final.md`](superpowers/plans/2026-10-19-v-track-final.md) the final plan (one whole-number rule, the label print queue's gates, a live field read once, and these docs). |
```

- `docs/14_UI_UX_DESIGN_SYSTEM.md`, edit 11 of 11. Old:

```md
- Test loading, empty, error, denied, offline, and partial-failure states.
```

  New:

```md
- Test loading, empty, error, denied, offline, and partial-failure states.
- Save each form empty and with a wrong value: no browser bubble and no toast; the first wrong field takes focus (on its tab, in its section or step) with its error under it, read once; a button that waits stays focusable and reads its reason.
```

- `.impeccable/design.json`, edit 1 of 8. Old:

```json
  "generatedAt": "2026-10-17T00:00:00+07:00",
```

  New:

```json
  "generatedAt": "2026-10-19T00:00:00+07:00",
```

- `.impeccable/design.json`, edit 2 of 8. Old:

```json
Disabled and busy buttons turn grey with faint text instead of fading.",
```

  New:

```json
Disabled and busy buttons turn grey with faint text instead of fading. A prerequisite gate is aria-disabled: it keeps focus, aria-describedby points at the visible line that says why, and its handler returns first; a rule about what the person typed never disables the save.",
```

- `.impeccable/design.json`, edit 3 of 8. Old:

```json
Panel fill, 3:1 border, focus halo, error through aria-invalid.",
```

  New:

```json
Panel fill, 3:1 border, focus halo, error through aria-invalid. The error line sits under the hint (13px danger text, no alert role), aria-describedby reads it first, and a save focuses the first wrong field.",
```

- `.impeccable/design.json`, edit 4 of 8. Old:

```json
aria-describedby=\"ds-asset-tag-hint\" /><p class=\"ds-field-hint\" id=\"ds-asset-tag-hint\">Letters, digits and dashes</p></div>",
```

  New:

```json
aria-invalid=\"true\" aria-describedby=\"ds-asset-tag-error ds-asset-tag-hint\" /><p class=\"ds-field-hint\" id=\"ds-asset-tag-hint\">Letters, digits and dashes</p><p class=\"ds-field-error\" id=\"ds-asset-tag-error\">This value already exists</p></div>",
```

- `.impeccable/design.json`, edit 5 of 8. Old:

```json
.ds-field-hint { margin: 0; font-size: 13px; line-height: 1.5385; color: #56677F; }
```

  New:

```json
.ds-field-hint { margin: 0; font-size: 13px; line-height: 1.5385; color: #56677F; } .ds-field-error { margin: 0; font-size: 13px; line-height: 1.5385; color: #B3261E; }
```

- `.impeccable/design.json`, edit 6 of 8. Old:

```json
On phones the box sits above the iPhone home bar.",
```

  New:

```json
On phones the box sits above the iPhone home bar. A field's error shows under its field in the body; an error of the dialog's action that names no field shows as a danger Notice at the top of the body.",
```

- `.impeccable/design.json`, edit 7 of 8. Old:

```json
      "Do support Thai and English text, keyboard navigation, visible focus states, reduced motion, touch-safe mobile/tablet controls, and clear empty, loading, error, permission-denied, and validation states.",
```

  New:

```json
      "Do support Thai and English text, keyboard navigation, visible focus states, reduced motion, touch-safe mobile/tablet controls, and clear empty, loading, error, permission-denied, and validation states.",
      "Do check a form on save (noValidate and validate()), show each error under its field, take the person to the first wrong field and land the server's fieldErrors on the same fields.",
```

- `.impeccable/design.json`, edit 8 of 8. Old:

```json
drop required or maxLength from a control when it moves into Field, or give a dialog its own form when it renders inside another form.",
```

  New:

```json
drop required or maxLength from a control when it moves into Field, or give a dialog its own form when it renders inside another form.",
      "Don't show a field's error in a toast or the browser's bubble, announce it as an alert, or keep a rule behind a disabled button with no reason on screen.",
```

- `tests/form-migration-guards.test.ts`, edit 1 of 3. Old:

```ts
Two lists are not budgets: CONSTRAINT_FLOORS only protect, and STAR_ONLY's three stars wait for the V track.
```

  New:

```ts
Two lists are not budgets: CONSTRAINT_FLOORS only protect, and STAR_ONLY stays empty since the V track (a form that checks itself may show a star alone, GF4).
```

- `tests/form-migration-guards.test.ts`, edit 2 of 3. Old:

```ts
// not a line number. The V track adds required and then removes the entry (the meta-test fails while one is stale).
```

  New:

```ts
// not a line number. Empty since the V track, which checks every starred field in its form's validate() (GF4); the
// meta-test fails while an entry is stale.
```

- `tests/form-migration-guards.test.ts`, edit 3 of 3. Old:

```ts
  // A STAR_ONLY entry is still a Field with the star whose control has no native required; the V track removes it.
```

  New:

```ts
  // A STAR_ONLY entry is still a Field with the star whose control has no native required (the list is empty since the V
  // track).
```

- `tests/asset-status-correction-ui.test.ts`, edit 1 of 1. Old:

```ts
  // The error line stays as it is until the V track ties it to the field (spec 2C §4 ruling 17).
```

  New:

```ts
  // A refusal that names no field keeps this line under the form (spec §4.1.3); the reason's own error sits under its field
  // (v-track plan 2 A5).
```

- `tests/validation-guards.test.ts`, edit 1 of 1. Old:

```ts
// required select an id and an error. SELECT_STAR_ONLY counts down the required selects that nothing checks yet; the
// V track ends with V_FORMS equal to V_SCOPE and SELECT_STAR_ONLY empty. Never add a row to make a guard pass.
```

  New:

```ts
// required select an id and an error. Since V track plan 3, V_FORMS equals V_SCOPE and SELECT_STAR_ONLY is empty: a new
// form joins both lists in the commit that adds it, and a new required select is checked from the start. Never add a row
// to make a guard pass.
```

  After Step 3, nothing else fails: the pinned phrases of `tests/phase2d-docs.test.ts` and `tests/dark-mode-docs.test.ts` are kept, and the three test files change only in comments. There is no Step 4 pin edit in this task.
- [ ] **Step 4: Check the docs by reading** (no edit): `node -e "JSON.parse(require('fs').readFileSync('.impeccable/design.json','utf8'))"` exits 0; read the new `DESIGN.md` section against the code of Tasks 1–3 (`wholeNumber`, the `liveError` rule, the print queue's ids) and report any sentence the code does not bear out.
- [ ] **Step 5: Verify.** `node --test tests/v-track-final.test.ts tests/phase2d-docs.test.ts tests/dark-mode-docs.test.ts tests/form-migration-guards.test.ts tests/asset-status-correction-ui.test.ts tests/validation-guards.test.ts` (0 fail); `npm test` (+1; **2309 tests, 2308 pass, 0 fail, 1 skipped**); `npx tsc --noEmit`; `npm run lint` (0 errors). `node <tools>/eol.mjs DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md .impeccable/design.json tests/form-migration-guards.test.ts tests/asset-status-correction-ui.test.ts tests/validation-guards.test.ts tests/v-track-final.test.ts` prints `676 676`, `147 147`, `595 595`, `505 505`, `22 22`, `227 227` and `0 164`.
- [ ] **Step 6: Commit.** `git add DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md .impeccable/design.json tests/form-migration-guards.test.ts tests/asset-status-correction-ui.test.ts tests/validation-guards.test.ts tests/v-track-final.test.ts`, then `git commit -m "docs(ui): the form-error rule in DESIGN.md, docs/14 and design.json (v-track final task 4, VF4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

## Controller: verify and dev-app check (Task 5)

### Task 5: Verify, production build and dev-app check in both themes (controller runs this task, not an implementer)

The shape of plan 3's Task 7. **No request but a GET reaches the server** (VF-R8): the settings save is fulfilled with a stand-in body, every other non-GET is aborted.

**Files:**
- Create then delete: your own launch configuration in `.claude/launch.json` while the server runs (never committed; if the file already holds another session's configuration, add your own entry and remove only that entry afterwards; delete the file only if you created it).
- Evidence (git-ignored): `.superpowers/sdd/screenshots/v-track-final/after/`, `.superpowers/sdd/v-track-final/task-5-counts/`, `.superpowers/sdd/v-track-final/task-5-findings.md`.
- Modify: only files needed to fix problems found here. Each fix is a new small task with its own test through an implementer and the normal review, before Task 6. A fix never adds an `EXEMPT`, `V_SCOPE`, `NOT_IN_SCOPE`, `NON_VALIDATION_TOASTS` or FMG row without a ruling, and it changes the counts below; say by how much in the findings.

**Interfaces:**
- Consumes: Tasks 1–4 committed; Task 0's baseline, counts, before evidence and region texts.
- Produces: `task-5-findings.md`, which Task 6 turns into the "Dev-app check" and "Still open" bullets of the handoff section and the "ตรวจบนแอป" bullet of the changelog entry.

- [ ] **Step 1: Verify.** Delete `.next/cache/turbopack` first (a stale Turbopack cache shipped old CSS before, wiki 47), then `npm run verify` (lint, tests, build). Expected: lint 0 errors and the baseline's warnings (all under `.agents/`); tests **2309 tests, 2308 pass, 0 fail, 1 skipped**; build **60/60 pages** (plan 3's verify; this plan adds no route, so another page count is a finding). Then `npx tsc --noEmit` (clean), `git status --short` (only the untracked items of the Global Constraints), and `node <tools>/eol.mjs tests/v-track-final.test.ts` (`0 164`).
- [ ] **Step 2: The built CSS.** In `.next/static/css/*.css`, the Button's `aria-disabled:` rules (`aria-disabled:pointer-events-none`, `aria-disabled:bg-background`, `aria-disabled:text-faint-foreground`; the three gates), `text-danger` and the `aria-invalid:` field rules (`aria-invalid:border-danger`, `aria-invalid:shadow-field-error`). Every class token of the `className` strings this plan adds (`git diff 71a9e95c HEAD -- src`: `mt-1 text-meta text-muted-foreground`, `w-full shrink-0 sm:w-auto`, `w-full`) was in use at `71a9e95c`. A missing rule is a finding to fix before Step 4.
- [ ] **Step 3: Counting evidence after.** `node <tools>/counts.mts .` and the commands of Task 0 Step 4 again, into `task-5-counts/`, compared with `task-0-counts/`: toasts outside a catch 23 in 11 (23 in 11); `<form … noValidate>` 47 (47); 4084 leaf keys per locale (4083); `V_FORMS` 44 (44); `SELECT_STAR_ONLY` `0 in 0`; FMG `STAR_ONLY` `new Set<string>([])`; `git grep -nE '\bstep\([^()]*, 1\)' -- src` nothing (4); `git grep -n 'pattern(String(' -- src` nothing (2); `git grep -n 'function wholeNumber' -- src` → `src/lib/list-pagination.ts:15` and `src/lib/validation-rules.ts` (`export function wholeNumber`); in the print queue `grep -c 'disabled={selectedForPrint.length === 0}'` 0 (2), `grep -c 'disabled={recentAssets.length === 0}'` 0 (1), `grep -c 'aria-disabled='` 3 (0); `git grep -cE '\bliveError(=\{|[[:space:]]|>)' -- src` → the same five files with `liveError={` at every site (`depreciation-policy-builder.tsx:1`, `system-settings-form.tsx:25`, `asset-batch-form.tsx:4`, `asset-form.tsx:2`; `field.tsx`'s own lines).
- [ ] **Step 4: Production server.**
  - Add a launch configuration `name: "asset-vf-start-3110"`, `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "start", "-p", "3110"]`, `port: 3110`, `autoPort: false` (another free port if 3110 is taken; say which in the findings), and start it with `preview_start`.
  - Confirm the dev database as in Task 0 Step 5 without opening `.env` (`/th/admin/readiness`); if anything suggests the production database, stop. Every page opens in the Playwright browser, never in the Browser pane `preview_start` opens. Log in with the seed admin of `prisma/seed.ts`; do not echo the password. The login is the one non-GET that reaches the server; never sign out during the task.
  - Prefer `waitUntil: "load"` plus a short wait over `networkidle`. Playwright code runs inline (`browser_run_code_unsafe`); a file you must create goes under `.playwright-mcp/` and is deleted right after the run.
- [ ] **Step 5: No request but a GET reaches the server** (the login aside). Right after the login, before any form, run Task 0 Step 6's handler code unchanged and its two probes in their order (the `POST` probe aborted; the `PUT` probe answering exactly `{ "error": "Something else", "code": "OTHER" }` with `PUT /api/admin/settings fulfilled 400` in the log). If either does not, stop and set the context up again with `serviceWorkers: "block"`; if the page or the context is recreated, run the handler and both probes again. Stand-ins are built from the code: the settings route answers a schema refusal as `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors }` keyed `settings.<key>` (`settingFieldKeyFor`). **Never:** a save with the handler off; a print with nothing selected. Count every non-GET at the end: each fulfilled or aborted, none continued; one that continued is a finding, reported with its route, its status and whether it wrote.
- [ ] **Step 6: The checks, at 1440 and 375, light and dark** (Task 0 Step 7's list), screenshots to `after/<page>-<state>-<theme>-<width>.png`:
  - **Whole numbers (Task 1; no request goes out):** the license total seats `1.5` (`/th/assets/new`, a software-license category), the round year `2569.5` (`/th/audit/rounds/new`), the PM custom days `1.5` (`/th/maintenance/pm/new`), the 12mm label width `40.5` (`/th/admin/settings`, label tab): each save shows "กรุณากรอกเป็นจำนวนเต็ม" under its field, focused, and the log has no new entry. A whole value (`2`, `2569`, `30`, `40`) shows nothing; the margin `0.3` still reads "กรุณากรอกเป็นตัวเลข" (open issue 2).
  - **The print queue (Task 2), `/th/asset-management/labels`:** with nothing selected both print buttons are reachable with Tab, look disabled, and their accessible description is "ยังไม่ได้เลือกทรัพย์สิน" (the empty note under them); Enter on each opens nothing (no new tab, no log entry). With a scope that holds nothing, "เพิ่มตามตัวกรอง" keeps its label, the line "ไม่มีรายการในขอบเขตนี้" shows under the scope summary beside it, the button is reachable, described by that line, and Enter adds nothing. With one asset added both print buttons are enabled with no description (do not press print), and "เพิ่มตามตัวกรอง" with assets in the scope adds them. Forced colors: the reasons show; record whether the three buttons still look disabled (an `aria-disabled` button gets no `GrayText` from the system and `globals.css` has no forced-colors rule for it, so they likely look enabled there, as every `aria-disabled` gate of plans 1–3 does: open issue 11, a finding for the user, not a fix in this plan).
  - **Live fields (Task 3), with Task 0 Step 6's region reader after each:** (a) the label width `40.5` saved on the label tab: the width is focused, its description holds the error, and **no region holds text**; (b) the prefix editor saved with an empty prefix: "กรุณาระบุข้อมูลนี้" under the prefix, focused, no region holds text; (c) the stand-in 400 with `"fieldErrors": { "settings.asset_label_12_width_mm": "labelWidthRange" }` and a save of any change: "ความกว้างป้ายต้องอยู่ระหว่าง 30–120 mm" under the width on the label tab, focused, no region holds text (set the stand-in back after); (d) typing an asset tag template without `{running}`: its region holds the live error at once, and saving then focuses it with the same text (the region unchanged); (e) the asset form: a duplicate asset tag typed (an existing tag of the dev data, found through `GET /api/assets/duplicates`): its region holds "รหัสทรัพย์สินนี้ถูกใช้งานแล้ว" (`asset.duplicateAssetTag`); clearing the tag empties the region. Compare each with Task 0 Step 7's region texts: (a), (b) and (c) held text before and hold none now; (d) holds the same.
  - **Clearing:** changing a field with a save's error removes that error; a new save recomputes.
  - **Reduced motion:** focus scrolls without animation on the settings and asset forms.
- [ ] **Step 7: Findings.** Write `task-5-findings.md` with these parts (Task 6 copies them):
  - **Fixes made:** commit and one line each, or "none".
  - **Checked and passed:** what, where, in which themes and widths, with results; the verify numbers of Step 1; the built CSS of Step 2; the counts of Step 3; every non-GET of Step 5 with "fulfilled <status>" or "aborted" (none continued).
  - **Differences from Task 0's before evidence:** each mapped to a decision of this plan (any other is a finding to fix).
  - **Found but not caused by this plan.**
  - **For the user:** the open issues on screenshots (2 the margin's sentence, 4 the add-filtered reason while the queue loads, 7 the late focus after a review dialog if seen on the way, 11 the gates' look in forced colors).
  - **Still needs a person:** NVDA on a live field (the asset tag's duplicate and a settings width saved with a fraction: one reading each) and on the print queue's three gates; real phones (the print queue's sticky panel with its reason); an English pass of "Enter a whole number".
- [ ] **Step 8: Clean up.** Stop your server, remove your launch configuration and every helper you put under the repo. `git status --short` shows only the untracked items of the Global Constraints. No commit in this task unless Step 7 lists fixes (each its own task).

---

## The record (Task 6)

### Task 6: The V track's final plan in the handoff and the changelog (`DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `tests/v-track-docs.test.ts`)

Spec §9; the shape of plan 3's Task 8. The handoff section before `## Open Go-Live Decisions`, after plan 3's (H2); the Thai changelog entry first under the newest date (C1 when `<today>` is 2026-10-19, else C1b with a new date heading); the handoff's header date (H1, only on a later date). Plan 3's record test moves its "first under the newest date" assertion (P1), and the file gains this plan's record test (T).

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `tests/v-track-docs.test.ts` (all `i/lf w/crlf`).
- Read: `.superpowers/sdd/v-track-final/task-5-findings.md` (Task 5, git-ignored) and this plan's "Open issues" (the user's answers, its first line). **If the findings file is missing, or the open issues have no answer line, stop and report before editing anything:** never write the dev-app check or the answers without them.

**Interfaces:** produces `## V Track Final Plan (<today>)` with a `- Dev-app check: checked (Task 5) on …` bullet, and `### ข้อความผิดพลาดใต้ช่องกรอก รอบสุดท้าย (งาน V plan สุดท้าย)` with a `- **ตรวจบนแอป:** (Task 5) ตรวจบน …` bullet; Task 7 inserts the verify line directly above each (both prefixes occur once in their file: earlier sections say `(Task 22)`, `(Task 30)`, `(Task 32)` and `(Task 7)`).

**Changes at the end of Task 5** (no task of this plan edits these files before this one):

| Id | Line | What changes | Rule |
|---|---|---|---|
| H1 | `DEVELOPER_HANDOFF.md:3` | `> Last updated: 2026-10-19` → `> Last updated: <today>`, only if `<today>` is not 2026-10-19 | — |
| H2 | `DEVELOPER_HANDOFF.md:1150` | this plan's section before `## Open Go-Live Decisions` (after plan 3's) | spec §9 |
| C1 | `docs/99_CHANGELOG.md:9` | the entry above plan 3's entry under `## 2026-10-19` (C1b instead when `<today>` is another date) | spec §9, `docs/19_THAI_GLOSSARY.md` |
| P1 | `tests/v-track-docs.test.ts:78` | plan 3's entry is no longer the first under the newest date: the assertion finds it under 2026-10-19 | plan 3 Task 8 P1 |
| T | `tests/v-track-docs.test.ts` (end) | this plan's record test | spec §9 |

- [ ] **Step 1: The failing test.** Append this plan's record test to `tests/v-track-docs.test.ts` with the Edit tool, so the appended lines are CRLF like the file. The old string is the last seven lines of plan 3's test, from its `(Task 7)` line to the final `})` (the `(Task 7)` line makes it occur once; plan 2's test ends the same way but says `(Task 32)`); the new string is those seven lines followed by the block:

- `tests/v-track-docs.test.ts`, edit 1 of 1. Old:

```ts
  assert.match(changelog.slice(entry, changelog.indexOf("\n### ", entry + 1)), /\n- \*\*ตรวจบนแอป:\*\* \(Task 7\) ตรวจบน \S/, "the dev-app check bullet")
  // Every marker of the template is filled; a failure lists the path and the markers left.
  const markers = /<today>|<N>|<from task-findings>|<จาก task-findings>|<from open-issues>|<จาก open-issues>/g
  for (const [path, text] of [["DEVELOPER_HANDOFF.md", handoff], ["docs/99_CHANGELOG.md", changelog]]) {
    assert.deepEqual([path, text.match(markers) ?? []], [path, []])
  }
})
```

  New:

```ts
  assert.match(changelog.slice(entry, changelog.indexOf("\n### ", entry + 1)), /\n- \*\*ตรวจบนแอป:\*\* \(Task 7\) ตรวจบน \S/, "the dev-app check bullet")
  // Every marker of the template is filled; a failure lists the path and the markers left.
  const markers = /<today>|<N>|<from task-findings>|<จาก task-findings>|<from open-issues>|<จาก open-issues>/g
  for (const [path, text] of [["DEVELOPER_HANDOFF.md", handoff], ["docs/99_CHANGELOG.md", changelog]]) {
    assert.deepEqual([path, text.match(markers) ?? []], [path, []])
  }
})

// V track, the final plan, the docs (task 6): the handoff section and the Thai changelog entry record the final plan
// after plan 3's, with every marker filled; two names the section gives are checked against the code that holds them.
test("the handoff and the changelog record the V track's final plan in place, with every marker filled (v-track final task 6)", () => {
  const handoff = read("DEVELOPER_HANDOFF.md")
  const section = handoff.indexOf("\n## V Track Final Plan (")
  assert.ok(section > handoff.indexOf("\n## V Track Plan 3 ("), "the final plan's section follows the plan 3 one")
  assert.ok(section < handoff.indexOf("\n## Open Go-Live Decisions"), "and comes before Open Go-Live Decisions")
  const record = handoff.slice(section, handoff.indexOf("\n## Open Go-Live Decisions"))
  assert.match(record, /\n- Dev-app check: checked \(Task 5\) on \S/, "the dev-app check bullet")
  assert.ok(record.includes("`wholeNumber`") && record.includes("`common.validation.notWholeNumber`"), "the whole-number rule")
  assert.match(read("src/lib/validation-rules.ts"), /\nexport function wholeNumber\(value: number \| string \| null \| undefined\): RuleCode \| null \{\n/)
  assert.ok(record.includes("`Field liveError`"), "the live field")
  assert.ok(read("src/components/ui/field.tsx").includes("\n  liveError?: string | null\n"), "Field's liveError takes the live text")
  const changelog = read("docs/99_CHANGELOG.md")
  const newest = changelog.indexOf("\n## ")
  const entry = changelog.indexOf("\n### ข้อความผิดพลาดใต้ช่องกรอก รอบสุดท้าย (งาน V plan สุดท้าย)\n")
  assert.ok(newest !== -1 && entry !== -1, "the newest date and the final plan's entry")
  assert.equal(changelog.indexOf("\n### ", newest), entry, "the final plan's entry is the first one under the newest date")
  assert.ok(entry < changelog.indexOf("\n### ข้อความผิดพลาดใต้ช่องกรอก รอบ 3 (งาน V plan 3)\n"), "above the plan 3 entry")
  assert.match(changelog.slice(entry, changelog.indexOf("\n### ", entry + 1)), /\n- \*\*ตรวจบนแอป:\*\* \(Task 5\) ตรวจบน \S/, "the dev-app check bullet")
  // Every marker of the template is filled; a failure lists the path and the markers left.
  const markers = /<today>|<N>|<from task-findings>|<จาก task-findings>|<from open-issues>|<จาก open-issues>/g
  for (const [path, text] of [["DEVELOPER_HANDOFF.md", handoff], ["docs/99_CHANGELOG.md", changelog]]) {
    assert.deepEqual([path, text.match(markers) ?? []], [path, []])
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-docs.test.ts`. Expected: 4 tests, 1 fail: "the handoff and the changelog record the V track's final plan in place, with every marker filled (v-track final task 6)" (`the final plan's section follows the plan 3 one`: there is no `## V Track Final Plan (` yet, so its index is −1).
- [ ] **Step 3: Implement.** H2 (and H1 on a later date) in `DEVELOPER_HANDOFF.md`; then C1 in `docs/99_CHANGELOG.md` if `<today>` is 2026-10-19, otherwise C1b (one of the two, never both). Exact-string edits with the Edit tool, which keeps the files' CRLF:

- `DEVELOPER_HANDOFF.md`, edit 1 of 1. Old:

```md
## Open Go-Live Decisions
```

  New:

```md
## V Track Final Plan (<today>)

- Branch `feat/v-track-final` in the main checkout (from `master` `71a9e95c`: V track plans 1 to 3 merged; not deployed). Spec `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` (the user's decisions U1–U9) · plan `docs/superpowers/plans/2026-10-19-v-track-final.md` (the last plan of the track: one whole-number rule, the label print queue's gates, a live field read once, and the form-error rule in the design docs, spec §9 item 4).
- No migration, database write, schema, dependency or server change. Messages (through `scripts/messages-edit.mjs`): +1 key, `common.validation.notWholeNumber` ("กรุณากรอกเป็นจำนวนเต็ม" / "Enter a whole number"): 4083 → 4084 keys.
- **One whole-number rule (Task 1):** `wholeNumber` in `src/lib/validation-rules.ts` (an empty value is left to `required`, text that is not a number is `invalidNumber`, a fraction is `notWholeNumber` and reads `common.validation.notWholeNumber`) replaces plan 2's three restatements (P-R8): the license seats' `pattern(…, /\d+/)`, which read "รูปแบบไม่ถูกต้อง", the audit round's own helper, and `step(v, 1)` in the PM days and in the settings' running digits, deactivation limit and label sizes. The server is unchanged: zod's `.int()` still answers `invalidNumber`.
- **The label print queue (Task 2):** print, print one test label and add filtered are `aria-disabled` while they cannot run, tied by `aria-describedby` to the line that says why (`asset-label-print-reason`, the empty note "ยังไม่ได้เลือกทรัพย์สิน"; `asset-label-add-filtered-reason`, "ไม่มีรายการในขอบเขตนี้" beside the button, whose label now stays "เพิ่มตามตัวกรอง"); their handlers return first (plan 2 open issue 16).
- **A live field is read once (Task 3):** `Field liveError` takes the text of the check that runs while typing (`null` while it finds nothing) instead of a flag, and its polite region holds only that text; an error that a save or the server set shows under the field and is read once, by focus (plan 3 open issue 14). Its callers: the asset form's tag and serial, the batch's four row fields (`rowLiveError`), the 15 live settings (`settingLiveError`), each tape's nine label fields (`liveErrorFor`), the depreciation JSON (`jsonLiveError`) and the prefix editor's prefix.
- **The docs (Task 4):** `DESIGN.md` §5 **Forms: Errors Under the Field** (The Error Under the Field Rule: `noValidate` and `validate()`, errors under the field, focus to the first wrong field with `reveal`, the server's `fieldErrors`, no validation toast, prerequisite gates with a visible reason, one announcement per save), with the overview, the Thai Copy Rule, buttons, dialogs, `SearchableSelect`, toasts, live regions, `Field`, groups and the scan check brought in line, one Do and one Don't; `docs/14_UI_UX_DESIGN_SYSTEM.md` (its rows, a paragraph on the V guards, a Form errors registry row, a QA line); `.impeccable/design.json` (the gate, the field's error line, the dialog, one Do and one Don't; no narrative rule, whose sections are colors, typography and elevation only); the guard and pin comments that still said the V track was to come.
- **Guards and pins:** no `EXEMPT`, `V_SCOPE`, `V_FORMS`, `NOT_IN_SCOPE`, `NON_VALIDATION_TOASTS` or FMG row added or changed; toasts outside a catch in `src` 23 in 11 files, `<form … noValidate>` 47 and `V_FORMS` 44 (= `V_SCOPE`) as before. The pins that encoded the old behaviour were rewritten in the commit that changed it.
- **Tests:** new file `tests/v-track-final.test.ts` (4); one test added to `tests/v-track-docs.test.ts`; 2305 → <N> tests.
- **Rulings of this plan:** VF-R1–VF-R9.
- **The user's answers to the open issues:** <from open-issues>
- **Handed on:** the E2E suite (Playwright, desktop and phone, both themes, on a separate local test database) and then the one deploy (wiki 27); the open issues the user left for later (above).
- Dev-app check: checked (Task 5) on <from task-findings>
- Before/after screenshots: `.superpowers/sdd/screenshots/v-track-final/before/` and `after/` (git-ignored, on the development machine only).
- Still open, for a person before the one deploy: <from task-findings>, together with the open checks of the sections above.
- Next: merge this branch (the V track is then complete); then the E2E suite and the one deploy (wiki 27).

## Open Go-Live Decisions
```

- `docs/99_CHANGELOG.md`, edit 1 of 1. Old:

```md
### ข้อความผิดพลาดใต้ช่องกรอก รอบ 3 (งาน V plan 3)
```

  New:

```md
### ข้อความผิดพลาดใต้ช่องกรอก รอบสุดท้าย (งาน V plan สุดท้าย)

Branch `feat/v-track-final` (จาก `master` `71a9e95c`) · design `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` · plan `docs/superpowers/plans/2026-10-19-v-track-final.md` (plan สุดท้ายของงาน V)

- **ขอบเขต:** กฎจำนวนเต็มกฎเดียว ปุ่มที่รอของคิวพิมพ์ป้าย การอ่านข้อความผิดพลาดของช่องที่ตรวจระหว่างพิมพ์ และกฎข้อความผิดพลาดใต้ช่องกรอกในเอกสารออกแบบ · ไม่แตะฐานข้อมูล ไม่มี migration ไม่เพิ่ม dependency ไม่แก้ server · ข้อความ: เพิ่ม 1 คีย์ `common.validation.notWholeNumber` ผ่าน `scripts/messages-edit.mjs` (4083 → 4084)
- **จำนวนเต็ม:** ช่องที่รับเฉพาะจำนวนเต็ม (จำนวนสิทธิ์ของ License ปีและอัตราสุ่มของรอบตรวจนับ จำนวนวันของแผนบำรุงรักษา จำนวนหลักเลขลำดับ จำนวนปิดใช้งานสูงสุดต่อรอบอัตโนมัติ และขนาดป้าย) ใช้กฎ `wholeNumber` เดียวกัน กรอกทศนิยมแล้วขึ้น "กรุณากรอกเป็นจำนวนเต็ม" ใต้ช่อง (เดิมขึ้น "กรุณากรอกเป็นตัวเลข" หรือ "รูปแบบไม่ถูกต้อง")
- **คิวพิมพ์ป้าย:** ปุ่มพิมพ์ป้ายที่เลือก ปุ่มพิมพ์ทดสอบ 1 ดวง และปุ่มเพิ่มตามตัวกรอง กดโฟกัสได้แม้ยังทำไม่ได้ และบอกเหตุผลที่เห็นบนหน้าจอ ("ยังไม่ได้เลือกทรัพย์สิน" / "ไม่มีรายการในขอบเขตนี้") · ปุ่มเพิ่มตามตัวกรองใช้ชื่อเดิมเสมอ เหตุผลอยู่ข้างปุ่ม
- **ช่องที่ตรวจระหว่างพิมพ์:** ข้อความผิดพลาดจากการบันทึกหรือจาก server ถูกอ่านครั้งเดียวเมื่อโฟกัสไปที่ช่อง ไม่อ่านซ้ำ (รหัสทรัพย์สินและ Serial ในฟอร์มทรัพย์สิน แถวของการเพิ่มหลายรายการ ค่าตั้งค่าที่ตรวจระหว่างพิมพ์ JSON นโยบายค่าเสื่อมราคา และคำนำหน้ารหัส)
- **เอกสารออกแบบ:** `DESIGN.md` มีหัวข้อ "Forms: Errors Under the Field" (กฎข้อความผิดพลาดใต้ช่องกรอก) และส่วนที่เกี่ยวข้องตรงกับโค้ดแล้ว · `docs/14_UI_UX_DESIGN_SYSTEM.md` เพิ่มแถวในตาราง ย่อหน้า guard ของงาน V แถวใน registry และรายการตรวจ QA · `.impeccable/design.json` เพิ่มปุ่มที่รอ ข้อความผิดพลาดใต้ช่อง และ Do / Don't
- **test:** ไฟล์ใหม่ `tests/v-track-final.test.ts` (4) · เพิ่ม 1 test ใน `tests/v-track-docs.test.ts` · test 2305 → <N>
- **deploy:** ไม่ deploy · deploy ครั้งเดียวหลังชุด E2E
- **ตรวจบนแอป:** (Task 5) ตรวจบน <จาก task-findings>
- คำตอบของผู้ใช้ต่อข้อที่ค้างของ plan: <จาก open-issues>
- ภาพก่อน/หลัง: `.superpowers/sdd/screenshots/v-track-final/before/` และ `after/` (git ignore อยู่บนเครื่องพัฒนา)
- ต่อไป: merge แล้วงาน V ครบทุก plan ต่อด้วยชุด E2E และ deploy ครั้งเดียว

### ข้อความผิดพลาดใต้ช่องกรอก รอบ 3 (งาน V plan 3)
```

  - **C1b, only if `<today>` is not 2026-10-19, instead of the changelog edit above:** replace the line `## 2026-10-19` (it occurs once) with: `## <today>`, a blank line, C1's new text without its last line (from `### ข้อความผิดพลาดใต้ช่องกรอก รอบสุดท้าย (งาน V plan สุดท้าย)` to its `- ต่อไป:` bullet), a blank line, `---`, a blank line and `## 2026-10-19`.
  - Fill the markers:
    - `<today>`: `YYYY-MM-DD`.
    - `<N>` (two places): the test count after this commit, Task 5's verify count + 1 for this task's test: **2310** when Task 5 made no fix; the same number Task 7's verify line records.
    - `<from open-issues>` with the user's answers in English, in the shape of plan 3's bullet (the date, the words the user used, each issue's answer in a few words, and the task that carries any answer that is not the default); `<จาก open-issues>` with the same in Thai.
    - `<from task-findings>` (two places in the handoff) with the findings file in English, in the shape of plan 3's "Dev-app check" bullet: after `checked (Task 5) on `, the server, port and commit, the build, what passed with numbers, every non-GET request of Task 5 Step 5 with "fulfilled" or "aborted" (none reached the server), the differences from Task 0 and their decisions, the fixes or "no fixes"; in the "Still open" bullet the "Still needs a person" and "For the user" parts as sub-bullets (two spaces, `- `).
    - `<จาก task-findings>` with the same in Thai after `(Task 5) ตรวจบน `, glossary words.
  - Never invent findings or answers: if the findings file does not exist, stop (the marker test passes on any text, so the test does not catch this).
  - After Step 3 and before Step 4, `node --test tests/v-track-docs.test.ts` fails exactly one test: plan 3's, "the handoff and the changelog record V track plan 3 in place, with every marker filled (v-track plan 3 task 8)", with "the plan 3 entry is the first one under the newest date".
- [ ] **Step 4: Pin edit (P1)** (exact; the old string occurs once: the appended test's message says "the final plan's entry …"):

- `tests/v-track-docs.test.ts`, edit 1 of 1. Old:

```ts
  assert.equal(changelog.indexOf("\n### ", newest), entry, "the plan 3 entry is the first one under the newest date")
```

  New:

```ts
  assert.equal(changelog.lastIndexOf("\n## ", entry), changelog.indexOf("\n## 2026-10-19\n"), "the entry sits under 2026-10-19 (the final plan's entry went above it later, v-track final task 6)")
```

  Plan 3's `newest` constant stays in use (the `assert.ok` above it). C1 and C1b both keep the line `## 2026-10-19`, so the pin holds on either date.
- [ ] **Step 5: Verify.**
  - `node --test tests/v-track-docs.test.ts tests/dark-mode-docs.test.ts tests/phase2d-docs.test.ts` (0 fail).
  - `grep -n "<today>\|<N>\|<from \|<จาก " DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md` → nothing.
  - `node <tools>/eol.mjs DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md tests/v-track-docs.test.ts` → equal numbers for each (all three stay CRLF): `1184 1184`, `1979 1979` and `113 113` with C1 and one-line findings and answers (more when the findings add sub-bullets).
  - `git diff --numstat` → only the three files: `18 0 DEVELOPER_HANDOFF.md`, `16 0 docs/99_CHANGELOG.md`, `28 1 tests/v-track-docs.test.ts` with C1 (more lines only from the findings' sub-bullets).
  - `npm test` (+1; **2310 tests, 2309 pass, 0 fail, 1 skipped**); `npx tsc --noEmit`; `npm run lint` (0 errors).
- [ ] **Step 6: Commit.** `git add DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md tests/v-track-docs.test.ts`, then `git commit -m "docs(forms): the V track's final plan in the handoff and the changelog (v-track final task 6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 7: Final verification, wiki and memory (controller runs this task)

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` (the verify line each).
- Modify (vault `D:\Obsidian\Eltross`): `AssetSystem/ams-status.md`, `AssetSystem/ams-log.md`, `AssetSystem/ams-open-questions.md`, and any page that says a whole number reads "กรุณากรอกเป็นตัวเลข", that the label queue's buttons are disabled, or that the V track's docs are still to come.
- Modify (auto-memory `C:\Users\Eltross\.claude\projects\D--Antigravity-asset-system\memory\`): `v-track.md` and `MEMORY.md`'s line for it.

- [ ] **Step 1: Verify.**
  - `npm run verify`: record the test count (**2310 tests** when Task 5 made no fix) and the build's page count (60/60 expected; record what verify prints).
  - Add ``- `npm run verify` ผ่าน (test N · ผ่าน N · ข้าม 1 · build X/X หน้า)`` to the plan's changelog entry, directly above its `- **ตรวจบนแอป:** (Task 5) ตรวจบน ` bullet (numbers with thousands commas, as plan 3's entry writes them): old string `- **ตรวจบนแอป:** (Task 5) ตรวจบน `, new string the verify line, a line break and the old string.
  - Add ``- Verification: `npm run verify` passes (tests N · pass N · skipped 1 · build X/X pages).`` to the handoff section, directly above `- Dev-app check: checked (Task 5) on `, the same way.
  - Both old strings occur once in their file. Both files are CRLF: insert with the Edit tool. `node <tools>/eol.mjs DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md` → equal numbers for each, one more than after Task 6; `git diff --numstat` → `1 0` for each.
  - `npm test` again (the same count), then `git add DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md` and `git commit -m "docs(ui): record the V track final plan's verify results" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
- [ ] **Step 2: Wiki.** Read `AssetSystem/_schema/ams-wiki-schema.md` first, then edit:
  - `ams-status.md`: the row that holds the V track (`grep -n "งาน V" AssetSystem/ams-status.md`): the final plan built on `feat/v-track-final` with the verify numbers, not merged, not deployed; the V track complete once merged; next the E2E suite. Fix any sentence the row now contradicts.
  - `ams-log.md`: an entry at the top of `## <today>` (a new date heading if `<today>` has none).
  - `ams-open-questions.md`: item 27's order line shows the V track's progress (plans 1–3 ✓, the final plan built); this plan's open issues as the user answered them; Task 5's "Still needs a person" as one new item after the last number, in the shape of plan 3's.
  - Pages that state the form-error rule, the whole-number sentence or the print queue's buttons: find them with `grep -rlnE "กรุณากรอกเป็นตัวเลข|wholeNumber|asset-label-batch-tool|liveError|DESIGN\.md" AssetSystem` and read each hit; state what the code does now, with `sources` pointing at `DESIGN.md`, `src/lib/validation-rules.ts`, `src/components/ui/field.tsx` or `src/components/assets/asset-label-batch-tool.tsx`, and `confidence` as the schema says for a page checked against the code.
  - A new page (only if a fact has no page yet) gets its line in `ams-index.md` and an `ams-` name no other page of the vault holds; every page you touch keeps `status` / `verified` / `confidence` / `sources`.
  - Run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` from `D:\Obsidian\Eltross` (0 errors), and commit only the files you edited (`git -C D:/Obsidian/Eltross add <each file>`, then `git -C D:/Obsidian/Eltross commit -m "ingest: asset-system V track final plan built on feat/v-track-final"`). Never stage other sessions' changes in the vault.
- [ ] **Step 3: Memory.** `v-track.md`: the final plan built on `feat/v-track-final` (the whole-number rule, the print queue's gates, the live field read once, the docs; the test count verify printed), not merged, not deployed; the user's answers to its open issues; the wiki item of Step 2; next the E2E suite in both themes, then the one deploy. `MEMORY.md`'s one-line entry for `v-track.md` says the same in one line.
- [ ] **Step 4: Finish** with superpowers:finishing-a-development-branch. The spec merges each plan of the track in order (§9): a local merge fast-forwards `master` (`git merge --ff-only feat/v-track-final` from `master`; if `master` moved, stop and ask) and runs the tests on the merged result. **No push and no merge without the user.** After a merge, offer once to delete this plan's scratch files in `<temp>` (the drafting script and its edit lists; the memory's "delete scratch clones once a plan is merged"), and delete only on the user's yes.

---

## Spec coverage

This plan's scope is spec §9 item 4 and the four items the user approved on 2026-10-19; with it every item of spec §9 is done.

| Spec | What it asks | Where in this plan |
|---|---|---|
| §2 U1 | errors under the wrong field; go to the first one | written as the rule (Task 4); built in plans 1–3 |
| §2 U2 | no validation toasts | written (Task 4: DESIGN.md toast bullet and the rule's section, docs/14 toast row, a Don't); V3 unchanged |
| §2 U3, U9 | `fieldErrors` | written (Task 4: the Thai Copy Rule, the section); no server change (VF-R7) |
| §2 U5 | every form in one round | `V_FORMS` = `V_SCOPE` (44) held; the print queue is not a form of the scope (VF-R3) |
| §2 U6 | errors after save | unchanged; written (the section) |
| §2 U7 | no new dependency; shared helpers | `wholeNumber` joins the helpers (Task 1); no dependency |
| §2 U8 | live warnings stay live, nothing twice | Task 3 (a save's error never in the live region); written (the section, `Field` bullet) |
| §3 G3 | prerequisites keep their gate and say why | Task 2 (the print queue's three gates); written (the section, Button rows) |
| §3 G5 | one announcement per submit | Task 3; written (the section, the live-region roles) |
| §3 anti-goals | "a live warning … and an under-field error for the same mistake"; "five alerts" | Task 3 (one reading); written |
| §4.4 | content rules vs prerequisites; `aria-disabled` + `aria-describedby` | Task 2; written (Task 4) |
| §4.5 | `validate()` restates every constraint, through shared helpers | Task 1 (the step of 1 through one helper) |
| §7.1 | shared messages | `common.validation.notWholeNumber` (Task 1) |
| §7.2 | rule helpers return codes | `wholeNumber` → `"notWholeNumber"` / `"invalidNumber"` (Task 1) |
| §7.3 | `FieldError` not an alert; live errors keep a polite announcement | Task 3 |
| §8 | no dependency or write; messages through the script; guards; pins in the same commit | Global Constraints; VF-R8; each Step 4 |
| §9 item 4 | `DESIGN.md` (the form error rule replaces "toast for validation"), docs/14, `.impeccable/design.json`, handoff, changelog, wiki; the dev-app check | Task 4; Task 6; Task 7; Task 5 |
| §10 | left to the builder | the header's "Left to the builder (§10), decided here" |
| §11 call 2 | prerequisite gates use `aria-disabled` plus a visible reason | Task 2 |

The user's approved scope (2026-10-19) and what plans 1–3 handed on:

| Item | What it asks | Where in this plan |
|---|---|---|
| Scope 1 | the form-error rule in `DESIGN.md`, docs/14 and `.impeccable/design.json` (errors under the field, focus to the first wrong field, `noValidate` + `validate()`, `aria-disabled` gates with a visible reason, no validation toasts, the server's `fieldErrors`, live checks under the field, one announcement), and any doc or guard text that still says otherwise | Task 4 (VF-R5; its test checks each part, the clauses that are gone and the guard comments); Task 6 (handoff, changelog); Task 7 (wiki) |
| Scope 2 | one shared whole-number rule in `src/lib/validation-rules.ts` replacing every restatement, with a clearer sentence | Task 1 (VF-R2; `wholeNumber`, `notWholeNumber`; its test finds no `step(…, 1)`, `pattern(String(` or own helper left) |
| Scope 3 | the print queue's two print buttons with nothing selected and "เพิ่มตามตัวกรอง" with nothing to add: `aria-disabled` with a visible reason tied by `aria-describedby` | Task 2 (VF-R3) |
| Scope 4 | a save's or the server's error on a live field read once, fixed once in `Field` for every form | Task 3 (VF-R4: `Field liveError` carries the live text; the five callers) |
| Plan 2 open issues 12, 16; plan 3 open issues 2, 14 | the shared whole-number rule; the print queue's buttons; a clearer whole-number sentence; a live field read once | Tasks 1, 2, 1, 3 |
| Plan 3 open issue 11 | the prefix editor's transfer arrows "to the final plan's sweep" | not in the approved scope: open issue 6 |
| Plan 2 dev-app polish | `waitForDialogToClose` focus about 1 s late; audit scan refusals stay toasts | not in the approved scope: open issues 7 and 8 |

## Open issues (answer before execution; each default is what the tasks write)

**Not answered yet.** Task 0 Step 1 stops until the user answers. Recommended answer for all: "ตามที่แนะนำ".

1. **The server still reads a fraction as `invalidNumber`** (VF-R2). zod's `.int()` maps to `invalidNumber` (`src/lib/field-errors.ts:57–58`, X-R2), so a fraction that reaches the server reads "กรุณากรอกเป็นตัวเลข" while the form says "กรุณากรอกเป็นจำนวนเต็ม". After Task 1 every form refuses a fraction before it sends, so only a request that skips the form meets it. **Default:** no server change. **Recommendation:** as written (the spec keeps the server out of this round; mapping `.int()` to `notWholeNumber` would make it a `FieldErrorCode` and widen `tests/v-track-f.test.ts`'s code list, a later one-line task if ever wanted).
2. **A label margin or gap off the 0.5 step still reads "กรุณากรอกเป็นตัวเลข"** (`step(value, 0.5)`, VF-R2): not a whole number, so the new sentence does not fit it. **Default:** unchanged. **Recommendation:** leave it (one setting pair, admin only); a sentence with the step (`{step}`) is a later message if UAT asks.
3. **The license seats change code and accept exponent notation** (VF-R2). Their `pattern(…, /\d+/)` read a fraction as "รูปแบบไม่ถูกต้อง" and refused `1e3` and `+5`, which the browser's step of 1 and the server (`.int().min(0)`) accept as 1000 and 5. **Default:** `wholeNumber` (the same reading as the other fields). **Recommendation:** as written.
4. **"เพิ่มตามตัวกรอง" waits while the queue is still loading or after a failed load** (VF-R3): the gate is `recentAssets.length === 0`, as today, so for a moment it says "ไม่มีรายการในขอบเขตนี้" while the list loads (the spinner line shows below). Today the button's label says the same. **Default:** the same condition. **Recommendation:** leave it; if UAT finds it confusing, a small later change hides the reason while `queueLoading`.
5. **"เพิ่มตามตัวกรอง" stays enabled when every item of the scope is already selected** (it adds nothing). **Default:** unchanged (not a gate today). **Recommendation:** leave it.
6. **The prefix editor's transfer arrows keep `disabled` while nothing is ticked** (plan 3 open issue 11 left them "to the final plan's sweep with the print queue's two buttons"; the user's scope of 2026-10-19 names only the print queue). They are a picker's action, not a submit, and the ticked boxes beside them show why. **Default:** unchanged (VF-R7). **Recommendation:** leave them; if the user wants the sweep complete, a small task (two `aria-disabled` pairs and a reason line) after this plan.
7. **Polish from plan 2's dev-app check: focus arrives about 1 s late after a review dialog closes** (`waitForDialogToClose`, `src/lib/field-focus.ts:116–134`, resolves only when the dialog leaves the DOM, after Radix's exit animation; callers checkout, checkin, transfer). Treating a dialog with no layout box or `data-state="closed"` as closed would focus sooner, but Radix's `onCloseAutoFocus` would then return focus to the opener after the field took it, so the three dialogs would also need to prevent their close auto-focus when a field is about to take focus; `tests/v-track2-o.test.ts` fakes `isConnected` and would gain a layout box. **Default:** unchanged (not in this plan). **Recommendation:** one small task after this plan merges and before the E2E suite (the suite would encode the timing), with its own dev-app check of the three review dialogs.
8. **Polish from plan 2's dev-app check: the audit scan's server refusals stay toasts.** The scan check saves through the offline queue, whose later replays cannot map back to a closed sheet (spec non-goal), and its online refusals name no field the sheet shows today. **Default:** unchanged. **Recommendation:** leave it to UAT on real phones; if a refusal turns out to name a field, a later task lands it under that field like the other forms.
9. **`.impeccable/design.json` gets no narrative rule** (VF-R5): the impeccable schema's rule sections are colors, typography and elevation, so the rule lives in the component entries, one Do and one Don't; `DESIGN.md` carries The Error Under the Field Rule. **Default:** as written. **Recommendation:** as written.
10. **The visible error line is hidden from browse reading only while the live region holds the same text** (VF-R4); a save's or the server's error is now in the page's reading order too (before, a live field hid every error line). **Default:** as written. **Recommendation:** as written.
11. **In forced colors (Windows high contrast) an `aria-disabled` button does not look disabled** (found by the final review). A real `disabled` button gets the system's `GrayText`; an `aria-disabled` one keeps the forced button colors, and `src/app/globals.css` has no forced-colors rule for `[aria-disabled="true"]`. Task 2 moves the print queue's three buttons from `disabled` to `aria-disabled`, so there they will look enabled in forced colors (the reason line still shows, Enter still does nothing), as every `aria-disabled` gate of plans 1–3 already does (the batch's row limits, the scan check's save, busy buttons). **Default:** unchanged in this plan; Task 5 records what it sees. **Recommendation:** one small task after this plan merges and before the E2E suite: an unlayered `@media (forced-colors: active)` rule that gives `[aria-disabled="true"]` buttons `GrayText` text and border, with a pin in `tests/visual-foundation-guards.test.ts`, for every gate at once.

### Behaviour changes a person would notice beyond the spec

Everything else a person sees change is a decision of the spec (errors under the field, the gates of §4.4, one announcement). Beyond it:
- A fraction in a whole-number field reads "กรุณากรอกเป็นจำนวนเต็ม" under the field (the seats read "รูปแบบไม่ถูกต้อง", the round year and sample rate, the PM days and the settings' digits and label sizes "กรุณากรอกเป็นตัวเลข"); the seats now accept `1e3` and `+5` (open issue 3).
- On the label print queue the two print buttons and "เพิ่มตามตัวกรอง" are reachable with Tab while they wait and read why; "เพิ่มตามตัวกรอง" keeps its label and shows "ไม่มีรายการในขอบเขตนี้" as a line beside it. In forced colors the three waiting buttons look like enabled ones (open issue 11).
- With a screen reader, a save's or the server's error on a field with a live check is read once, when the field takes focus (before: also by the polite region); in browse mode that error line is now read in its place.
