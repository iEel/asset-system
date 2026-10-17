# UI Round 4 Phase 2D Plan 5: Guard Lock and Final Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock the guards and finish the docs, the last plan of phase 2D (spec 2D §3.5), plus the items earlier plans and the user handed to it:
- one shared `EXEMPT` check (`tests/helpers/guard-exempt.ts`); `tests/visual-foundation-guards.test.ts` (VFG), `tests/form-migration-guards.test.ts` (FMG), `tests/list-frame-guards.test.ts` (LFG) and `tests/list-filters-ui.test.ts` read all of `src`, with `OWNERS` and exact `EXEMPT` rows instead of budgets; the lists of moved files and the budget helpers go (D1, D13, M18, M19);
- five new guards in VFG (D14: raw colors, dashed lines, raw `<button>`, disabled fades, button heights at `sm:`), each after the commits that move the sites it would fail;
- carried fixes: the asset state help trigger's 44px target on phones and two-line `StatStrip` feet (the user, 2026-10-16/17); DH 2D-2 R14 (the dashboard skeleton, four settings labels nobody reads, English literals on the Thai settings screens) and its integration loading text; 2D-4's option-select live text; `download` on every export link (the reports header and, by the user's answer to open issue CF-c, the other export screens); 76 message keys no code reads; and three sites the widened guards find (the findings page's freshness banner, the scanner input's two in-button spinners, the report phone cards' `leading-4` label);
- the last docs pass: `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `.impeccable/design.json`, this plan's handoff section and changelog entry, with a test that keeps "until 2D" and "2D moves" out of the three canonical docs (spec §1 point 5, §6).

Workflows, data, validation, permissions, the API and the database stay the same. Messages change only as "Messages" below lists.

**Architecture:**
- **One task is one commit**, with its tests, pins and guard edits in the same commit (spec §3, §5.6). The tree is green after every commit.
- **Task order:** CF, VG, FG, LG, NG, DC, with one move forced by a dependency: FG-5 runs after LG-2 (it deletes `budgetOverruns`, which LFG calls until LG-1).
  - CF (Tasks 1–9): the carried fixes, first, so every guard is locked over the code as it will stay.
  - VG (Tasks 10–12): the shared check, then VFG.
  - FG (Tasks 13–16): the findings banner, its key, GB2 over every spinner, then FMG's lock.
  - LG (Tasks 17–18) and FG-5 (Task 19): LFG's lock, the list filters, then `budgetOverruns` goes.
  - NG (Tasks 20–27): three code tasks, then N1–N5 one by one in VFG.
  - DC (Tasks 28–30, 32): the docs, after every code and guard task; DC-4 (Task 32) after the verify task (it reads its findings).
- **Hard dependencies:** Tasks 11–12, 16–17, 19 and 23–27 need Task 10 (the helper); Tasks 23–27 need Task 11 (VFG's `EXEMPT_LISTS` and phase 3 test) and append in order; Task 15 needs Task 13 (GB2 would also find the banner's spinner); Task 18 needs Tasks 16 and 17; Task 19 needs Tasks 11, 16 and 17; Task 23 needs Tasks 20 and 21 (N1 would find the lit torch and the scan button); Tasks 25 and 26 need Task 13 (N3 and N4 would find the banner) and Task 20; Task 27 needs Task 22; Task 5 needs Task 4 (same files); Task 9 runs after Tasks 4–7 (its key list is taken after them). Otherwise the areas are independent.
- **Task ids:** every task keeps its area id (`CF-1` …) in its title and commit message; the text cross-references by id or by "Task N (id)". The NG ids skip NG-4 and NG-5: their two carried fixes are Tasks 1 and 2 (R9).
- **Branch:** `feat/ui-phase2d-plan5` in the main checkout `D:/Antigravity/asset-system`. No worktree (D15).
- **Tests:** four new LF files, one test per commit, appended in order:
  - `tests/phase2d-final-ui.test.ts` (Tasks 1–9, 9 tests)
  - `tests/guard-exempt.test.ts` (Task 10, 6 tests, the helper's unit test)
  - `tests/guard-lock-sweep-ui.test.ts` (Tasks 20–22, 3 tests)
  - `tests/phase2d-docs.test.ts` (Tasks 28–30, 32, 4 tests)
  - and in the guard files: VFG gains its phase 3 test and N1–N5 (25 → 31 tests), FMG its phase 3 test (23 → 24), LFG loses L9 and L10 and gains its phase 3 test (23 → 22); `tests/feedback-states-ui.test.ts` and `tests/dead-code-cleanup.test.ts` gain one each; `tests/spinner-motion-ui.test.ts` (1) is deleted (Task 15).
  - Existing pins that lock what changes are edited in the same commit. Each new assertion fails before its change; where a test pins what must stay, its Step 2 says so.
- **Controller tasks:** Task 0 (branch, baseline, counting evidence, before evidence), Task 31 (verify, production build, dev-app check), Task 33 (verify numbers, wiki, memory, finishing). Task 32 (DC-4) is an implementer task that reads Task 31's findings.

**Interfaces between tasks:**

| Made in | What | Used by |
|---|---|---|
| Task 1 (CF-1) | `tests/phase2d-final-ui.test.ts` header: `read(path)` (LF), `C`, `D` | Tasks 2–9 |
| Task 4 (CF-4) | `tests/phase2d-final-ui.test.ts`: `messages(locale)`, a module-level const placed directly above Task 4's test (its first caller; in the Task 1 header it would be an unused-variable lint warning in `tests/` for Tasks 1–3) | Tasks 4–9 |
| Task 10 (VG-1) | `tests/helpers/guard-exempt.ts`: `ExemptKind`, `ExemptEntry`, `ExemptList`, `exemptProblems(rule, counts, exempt, owners?)`, `phase3Rows(lists)`; imported as `import { exemptProblems, phase3Rows, type ExemptList } from "./helpers/guard-exempt.ts"` (inline `type`) | Tasks 11, 12, 16, 17, 19, 23–27 |
| Task 11 (VG-2) | VFG: the header comment on the lists; `EXEMPT_LISTS` and the test "phase 3: every row the visual guards leave to phase 3, and their sum (spec 2D §5.1, D2)" last in the file; a new rule goes directly above `// Every EXEMPT list of this file, by rule` and joins `EXEMPT_LISTS` in its commit | Tasks 12, 23–27 |
| Task 12 (VG-3) | VFG's `./helpers/source-files.ts` import gains `countByFile` | Tasks 25, 27 edit the same line |
| Task 13 (FG-1) | `c/ui/data-freshness-banner.tsx` has no raw `<button>`, no `disabled:opacity-60`, no spinning `RefreshCw`, no `refreshing` label | Task 14 (the key), Task 15 (GB2 finds only the scanner), Tasks 25, 26 |
| Task 16 (FG-4) | FMG over all of `src`; GF2 reads every raw field | Task 18 (a raw field outside a search form is GF2's) |
| Tasks 11, 16, 17 | no guard calls `budgetOverruns` or a local `assertWithinBudget` | Task 19 |
| Task 20 (NG-1) | `tests/guard-lock-sweep-ui.test.ts` header `read(path)` | Tasks 21, 22 |
| Tasks 13, 20–22 | the sites N1, N3, N4 and N5 would fail have moved | Tasks 23, 25, 26, 27 |
| Tasks 1–27 | the code and guard end state the docs describe | Tasks 28–30, 32 |
| Task 31 | `.superpowers/sdd/ui-phase2d-plan5/task-31-findings.md` | Task 32 (DC-4) |
| Task 32 (DC-4) | the 2D-5 handoff section with its `- Dev-app check:` bullet and the changelog entry with its `- **ตรวจบนแอป:**` bullet | Task 33 inserts the verify bullets directly above them |

**Tech Stack:** Next.js 16.4 App Router · React 19 · Tailwind CSS 4.2 · class-variance-authority · tailwind-merge (through `cn()`) · next-intl 4 · Prisma 7 (not touched) · `node --test` with Node 24 type stripping.

**Spec:** `docs/superpowers/specs/2026-10-15-ui-phase2d-design.md`.
- **What this plan covers:** §1 points 2, 4 and 5 (what "2D done" means for the guards and the docs); §3.5; §4 M18 (FMG over all of `src` and its meta-test), M19 (the list filters past 13 files, I34), M35 (the last docs pass); §5.1 (the `EXEMPT` format, exact counts, a phase 3 sum), §5.2 (`OWNERS`), §5.3 (the starting `EXEMPT` points, recounted), §5.4 (the five new guards), §5.5 (three guard files, one shared check, the lists of moved files go, `TABLE_HEADER_FILLS` kept, FMG's meta-test, GF5 with `c/ui/scanner-text-input.tsx`, GB3's general rule), §6 (the docs), §8 rulings 1 and 2.
- **The user's decisions that bind it:** D1 (budget `{}` plus an `EXEMPT` list per rule: exact counts, `why` and `ruling` never empty, `kind` `permanent` or `phase 3`, a phase 3 sum), D2 (the phase 3 line: the register's bulk selection bar, the login page frame, the topbar search), D13, D14; the user, 2026-10-16/17: the 44px phone target of the asset state help, two-line `StatStrip` feet, codes inside translated sentences wait for phase 3 (not in this plan).
- **Carried items:** DH 2D-1 "Handed on" (FMG `BUSY_LABEL_SWAPS`, `.impeccable/design.json` button heights); DH 2D-2 R14 and "Handed on" (`DashboardPageSkeleton`, the four label props, the English literals, "กำลังโหลด clients", the shell's raw buttons); DH 2D-3 and 2D-4 "Accepted until their plan" (R5 raw buttons, R17 print and camera colors); 2D-4 R18 and open issue 10 c (`maintenance-option-select.tsx`'s English live text, `DataFreshnessBanner` for GB3); the 2D-2 dev-app check (the report header exports without `download`); the 2D-4 dev-app check (the rounds list's foot cut at 375).
- **Line numbers** are of `388d4d5` unless a step says "when this task runs". They move as earlier tasks edit a file; find every site by its quoted text.
- **Prior art:** `docs/superpowers/plans/2026-10-16-ui-phase2d-plan4.md` (format, rulings R1–R19, the vocabulary).

`D/` = `src/app/[locale]/(dashboard)/` · `P/` = `src/app/[locale]/(print)/` · `c/` = `src/components/` · `<temp>` = `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/p2d5-plan` (the controller hands the path to every implementer; change files go here) · `<tools>` = `<temp>/tools` (the read-only counting scripts and `eol.mjs`).

**Dry run:** the whole plan in this order, Tasks 1–30 and 32, one commit per task, in the scratch clone `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/p2d5-sim` (branch `sim5` from `388d4d5`, with `node_modules`). Not run: Tasks 0, 31 and 33 (controller tasks; so no production build, dev-app check, `task-31-findings.md`, wiki or memory step). Every named failing test failed first with the stated message and passed after its change; `tsc` and eslint were clean; every file kept its line endings. Final count after Task 32: **2188 tests, 2187 pass, 0 fail, 1 skipped**; the full `npm run lint` after Task 27: 0 errors, 146 warnings, all under `.agents/` (the baseline). Each task's count below is the dry run's exact one.
- Sim commit per task: 1 `5b84bc64` · 2 `13ab3727` · 3 `f836cae9` · 4 `216fb62c` · 5 `cf8f0f31` · 6 `c738cb12` · 7 `1b4a3b8e` · 8 `c99675b1` · 9 `dd9b4e8e` · 10 `dbd289bd` · 11 `756cf544` · 12 `d7cf86be` · 13 `209eda2f` · 14 `ff386c34` · 15 `df50df1c` · 16 `1178ce6c` · 17 `ed4b9e6d` · 18 `a79bc367` · 19 `ad6b6db1` · 20 `a293f7df` · 21 `9ed443b9` · 22 `c5485d3c` · 23 `a7de9938` · 24 `f8d3ed92` · 25 `517a475b` · 26 `e70fc408` · 27 `469dddc7` · 28 `fdbc2d06` · 29 `4e7862c2` · 30 `8719fb76` · 32 `91106e1a`.
- What the dry run changed in this plan:
  - Task 1: the `messages(locale)` helper left the test file's header (unused until Task 4, it was an eslint `no-unused-vars` warning in `tests/` for Tasks 1–3) and moved to the start of Task 4's Step 1 block; the Interfaces table and Task 1's Interfaces line say so. Task 1's eol line is `66 66` (63 lines at `388d4d5` plus the three-line comment, not `65 65`) and `0 32` for the test file.
  - Task 14: its grep claim also lists Task 13's `doesNotMatch` in `tests/feedback-states-ui.test.ts`; the key sits at line 2151 when the task runs; the messages files print `4242 4242`.
  - Task 28 Step 5: `git add -N tests/phase2d-docs.test.ts` before `git diff --numstat`, or the new file's `43 0` line never shows.
  - Task 32: H2's new text no longer says the `error.tsx:30` retry is left (plan 2D-1 moved it onto `Button` and deleted `ActionButton`); `<N>` is the count after Task 32's own commit (Task 31's + 1, 2188), as Task 33 records; a missing `task-31-findings.md` is a stop-and-report.
  - Every "about" count became the dry run's exact count; all of them had matched the plan's chain.
  - After the user's answers (2026-10-17): Task 8 took the nine other export links (CF-c) and Task 6 the `loadFailed` value (CF-b). The nine edits and Task 8's new test ran on the finished clone (branch `sim5-cfc` over Task 32): `npm test` 2188 / 2187 / 0 / 1 with them, and the test fails with the source edits stashed; Task 6 Step 3b is one more line in its change file and one more assertion in its test.
- Before assembly each area's tasks had also run in a scratch copy of `388d4d5` (no `node_modules`; the copies' full suites lost the same 41–61 package-importing files before and after), with the same results.

**Base:** `master` `388d4d5` (2D-4 merged and pushed, not deployed).

## Global Constraints

- **Git:**
  - Work in the main checkout `D:/Antigravity/asset-system` on branch `feat/ui-phase2d-plan5`, which holds `master` `388d4d5` and this plan's commit (`docs/superpowers/plans/2026-10-17-ui-phase2d-plan5.md`).
  - Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase` or `git clean`, and never touch `master`.
  - Commit only the files your task names. Use `git add <paths>` (quote paths with brackets or parentheses) and never `git add -A` or `git add .`. Task 15 deletes a file with `git rm`.
  - The checkout has untracked folders and files that are not yours: `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/` and `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`; another session may add `.claude/` while its preview server runs. Leave them alone.
  - End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Never create a git worktree whose `node_modules` is a junction to the main checkout's, and never let git remove one.
- **Next.js 16.4** is not the Next.js in your training data. This plan adds no Next.js API; Task 7 uses next-intl's `useTranslations` in a client component the way the repo's client components already do.
- **Line endings:**
  - `git config core.autocrlf` is `true`. Most files this plan edits are CRLF in the working tree (`i/lf w/crlf`): every `src` file it touches, the three guard files, `tests/list-filters-ui.test.ts`, `tests/helpers/source-files.ts`, `tests/list-primitives-ui.test.ts`, `tests/reports-adaptive-ui.test.ts`, `tests/audit-finding-resolution.test.ts`, `tests/list-pages-ui.test.ts`, `tests/scanner-text-input.test.ts`, `messages/th.json`, `messages/en.json`, `DESIGN.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` and `docs/14_UI_UX_DESIGN_SYSTEM.md`.
  - These are LF (`i/lf w/lf`): `.impeccable/design.json`, `tests/feedback-states-ui.test.ts`, `tests/dead-code-cleanup.test.ts`, `tests/disposal-sweep-ui.test.ts`, `tests/audit-scan-sweep-ui.test.ts`, `tests/spinner-motion-ui.test.ts` (deleted in Task 15), and the five new files (`tests/helpers/guard-exempt.ts` and the four test files).
  - Before you edit a file, run `git ls-files --eol <file>` and keep what it shows. In Git Bash, `grep -c $'\r'` reports 0 even for CRLF files, so do not use it as a check.
  - `git add` of an LF working-tree file prints "LF will be replaced by CRLF the next time Git touches it". That warning is expected and harmless: do not renormalize.
  - Edit with exact-string replacement (the Edit tool keeps the file's line endings), never a formatter, never `sed -i` (it writes LF in Git Bash), and never normalize a file.
  - Check line endings with `node <tools>/eol.mjs <file>…`. A CRLF file prints the same number twice; an LF file prints 0 and then the line count:

```js
// eol.mjs: node <tools>/eol.mjs <file>…   prints "<file> <CRLF count> <LF count>".
import { readFileSync } from "node:fs"
for (const file of process.argv.slice(2)) {
  const source = readFileSync(file, "utf8")
  console.log(file, (source.match(/\r\n/g) ?? []).length, (source.match(/\n/g) ?? []).length)
}
```

  - Tests that read source files strip `\r` (`.replace(/\r\n/g, "\n")`) before multi-line regexes.
- **How to read a task:**
  - **Changes at 388d4d5** is a table of the sites: the line, what is there now (quoted as it is, LF shown; a CRLF file has CRLF), what it becomes, and the rule. "Becomes" is exact where a test pins it (prop order included) and an exact description otherwise; every prop and class the row does not name stays. Rows may be applied in any order. It is not a replacement transcript: read the file, make the change, and let the task's tests and guards confirm it.
  - **Step 1 code blocks are exact:** create or append them byte for byte. "Append" adds the block at the end of the file; the first line of a block shown empty is the blank line before it.
  - **Pin edits and guard edits** are exact old → new strings; each old string occurs once in its file (a task that says `replace_all` says so). A guard task's whole edit is in its Steps 1 and 3; a code task's guard rows are in its Step 4.
  - **Line numbers "when this task runs"** assume every earlier task as written. Find each anchor by its text.
  - **A comment a row adds is source the tests read.** The `doesNotMatch` and counting regexes of a task's test, and every guard (the new N1–N5 included), read whole files, comments included, so a new comment never contains a string a test forbids or counts: class names (`text-white`, `border-dashed`, `disabled:opacity-60`, `sm:h-10`, `leading-4`), `<button`, `animate-spin`, a typed `"-"` after `||`, `??` or `:`.
  - **Exact counts.** A guard row holds the live count of `388d4d5` as changed by the earlier tasks of this plan. If a step's expected count differs from what you see, stop and report; never edit a row to make a test pass.
- **Tests:**
  - `npm test` runs `node scripts/run-tests.mjs` over `tests/**/*.test.{ts,mjs,js}`. Run one file with `node --test tests/<file>.test.ts`.
  - `tsconfig.json` includes `**/*.ts`, so **tests are type-checked**.
  - Modules that tests import use relative `.ts` imports (no `@/`). Tests cannot import `.tsx`; they read `.tsx` source text instead. A plain import of a type name fails under type stripping: use inline `type` specifiers.
  - A test file that imports another test file runs that file's tests again (VG-R6): each guard file sums its own phase 3 rows.
- **Baseline at `388d4d5`** (the 2D-4 verify that commit records; Task 0 checks it again):
  - `npm test`: 2159 tests, 2158 pass, 0 fail, 1 skipped; `npm run build`: 60/60 pages.
  - `npx tsc --noEmit`: clean. `npm run lint`: 0 errors, 146 warnings, all under `.agents/`.
  - **After this plan:** 2188 tests, 2187 pass, 1 skipped (+29: CF 9, VG 7, FG 2, LG −1, NG 8, DC 4). Each task states its exact count after its commit, as the dry run measured it with every earlier task as written (clone `p2d5-sim`, see "Dry run"). If yours differs, stop and report it with the task's own delta.
- **Every task ends with all of these green:** `npm test` with 0 fail and the task's count; `npx tsc --noEmit`; `npm run lint` with 0 errors and no new warning in `src/` or `tests/`. Report any failure by name.
- **Messages:** only through `node scripts/messages-edit.mjs <change file>`, with the change files of the tasks saved in `<temp>`, and only these keys (4137 → 4062):
  - Task 4 (CF-4) deletes `systemSettingsPage.generalSettings`, `.selectCategory`, `.accountingDepreciationPolicy`, `.ldapSyncSchedulePreset`;
  - Task 5 (CF-5) adds `systemSettingsPage.overviewDays`, `.depreciationLegacyRuleMonths`, `.ldapSyncModePreview`, `.ldapSyncModeManual`, `.ldapSyncModeScheduled`;
  - Task 6 (CF-6) changes the th value of `integrationApiPage.loading` and of `integrationApiPage.loadFailed` (the user, 2026-10-17, open issue CF-b);
  - Task 7 (CF-7) adds `common.searchSelectResultCount`;
  - Task 9 (CF-9) deletes the 76 keys of its change file;
  - Task 14 (FG-2) deletes `auditFinding.freshnessRefreshing`.
  - Words follow `docs/19_THAI_GLOSSARY.md`; `tests/thai-glossary.test.ts` and `tests/messages-parity.test.ts` stay green. If you think another key is missing or unused, stop and report.
- **No new tokens (2A I21).** No custom property in `:root`, `@theme inline` or `@theme`, no `@custom-variant`, no edit to `src/app/globals.css` or `tests/design-tokens-contrast.test.ts`, never `rounded-[…]`. Task 1's `after:` classes, Task 2's `line-clamp-2` and Tasks 20–21's `text-warning-foreground` / `text-primary-foreground` are existing utilities and tokens.
- **No migration, no DB write, no schema change, no API change.**
- **Guards: `EXEMPT` lists replace budgets.** From a guard file's lock task on (VFG Task 11, FMG Task 16, LFG Task 17, the list filters Task 18), every rule of that file reads all of `src`, and a file that counts above 0 is an owner of the rule (`OWNERS`, spec §5.2) or a row of its `EXEMPT` list with the exact live count; every other file counts 0. What "only go down" means now:
  - a row's count may only drop, in the commit that moves the site (to 0: the row is deleted); it never rises;
  - a row, an owner or a rule's reach is never added, except where a task's Changes table or rows table lists it as a decided exception from the inventory (every such row is in R8);
  - a count that drops without its row fails as well as one that rises, so the commit that moves a site edits its row;
  - before a file's lock task its old budgets and `KEEP` rows hold as in plan 2D-4 (never raise one), and no task of this plan adds a site to any rule;
  - `CONSTRAINT_FLOORS` (FMG GF5) are floors, not budgets: a floor may rise when a form adds a constraint and never drops; `STAR_ONLY` only shrinks (the V track empties it).
  - If a change would make a guard fail, stop and report; never add a row or an owner to make it pass.
- **No validation change.** Keep every `required`, `maxLength`, `minLength`, `pattern`, `toast.error` and `disabled` gate. FMG `CONSTRAINT_FLOORS` must still hold for the touched files: `admin/system-settings-form` [0, 1, 0], `auth/login-form` [2, 0, 0], `ui/scanner-text-input` [0, 1, 0] (a new floor row, Task 16).
- **Off limits:**
  - Never open, read or print `.env` or `.env.prod-admin`.
  - Implementers do not run `npm ci`, `npm install`, `npm run build`, the dev server, or anything against a database. The controller runs the app in Tasks 0 and 31.
  - Do not run skill helper scripts; they make network calls. The scripts in `<tools>` are read-only and run with the repo root as the working directory.
  - Keep helper scripts and change files in `<temp>`, outside the repo. Shell heredocs and `node -e` may drop backslashes: write regex-bearing text with a file-writing tool.
  - In Git Bash, MSYS rewrites a command-line argument that starts with `//` (a comment line passed to a helper script) as a path: set `MSYS_NO_PATHCONV=1` for such a call (dry run, Task 18). The Edit tool does not have this problem.
- **Deploy:** none. One deploy after 2D, Dark Mode, the V track and the E2E suite (D17, wiki 27).

## Rulings of this plan

- **R1, the earlier rulings apply** (plans 2D-1 to 2D-4, `docs/superpowers/plans/2026-10-15-ui-phase2d-plan1.md` … `2026-10-16-ui-phase2d-plan4.md`), above all those this plan's rows quote:
  - 2D-2 R10 and R11 (the topbar search is phase 3; the shell's navigation rows stay raw), 2D-3 R5 and 2D-4 R5 (the raw `<button>`s that stay, each with a comment), 2D-4 R6 (busy instead of disabled, no `disabled:opacity-*`, `h-8` → `sm`), 2D-4 R11 (`text-xs` sub-lines and labels → `text-meta`), 2D-4 R17 (print paper and camera imagery keep their own colors);
  - spec 2B R-n (print pages, label data, translated-sentence arguments, `src/lib` and the API keep `"-"`), R-q (the register's bulk bar for phase 3), I11 (the brand picker's `aria-current`), §9.4.3 (the `KEEP` table of 2B); 2C K13 (a busy button keeps its label), K21 (the label print toolbar's boxed fields), K23 (`ActionBar`), O20 (the room sheet's search), I27 (status lines with a spinner); 2A §9.5 (the thermal label's sizes), §9.8 (the shadows that stay), I23 (`Kbd`).
  - Each area of this plan adds its own rulings below (R2–R7), under the ids its tasks quote (`CF-R1`, `VG-R1`, `FG-R1`, `R-LG1`, `NG-R1`, `DC-R1` …). R8 lists every row they keep; R9 records the assembly decisions.
- **R2, the carried fixes (area CF, Tasks 1–9):**
  - **CF-R1, the help trigger's target (CF-1).** A 44 × 44px `::after` box below `md` (`relative after:absolute after:-inset-x-2.5 after:-top-4 after:-bottom-1 md:after:hidden`), not a bigger button and not negative margins: the circle, its hover fill and its focus ring stay 24px, and the layout does not move. The box is not centred: in a field the circle's label row is 20px with the circle's `-my-0.5`, then the field's 6px gap, so its own control starts 4px under the circle. A centred box (`after:-inset-2.5`) would cover the top 6px of the select the label names, and the positioned `::after` paints over the unpositioned select, so a tap there would open the help instead of the select. Upward there are 14px before the field above (the asset form's `gap-4` below `sm`); the box takes 16px, so it reaches 2px into the bottom edge of the field above, the least-used edge. From `md` the box is off: mouse pointers, and the register's table head (desktop only). `Field`, `FilterSelect` and the callers do not change.
  - **CF-R2, two-line feet (CF-2).** `line-clamp-2 break-words` on the foot text, `footTitle` kept for the cut text; the `attention` icon in a `flex h-5` box with the `<dd>` `items-start`, so the icon sits on the first line and a one-line foot renders as before. The subgrid stays, so feet of one strip row share their height. Not taken: one column on phones (the other option of the 2D-4 dev-app check), which changes every strip.
  - **CF-R3, the dashboard skeleton (CF-3).** It mirrors the page at `388d4d5`: 4 + 3 totals (`splitStatRows` of 7), action counts 3 + 3 (six is the most the page shows: the approval inbox, four queues and the cross-scope card; the 2D-2 dev-app check saw six), four cross-scope counts over a 96px preview block, four trends, the status rows `h-11 md:h-8` (44px rows below `md`, 32px from `md`) and five 64px activity rows. `PanelSkeleton` is a private helper drawing the `ContentPanel` frame (as `FilterPanelSkeleton` does), not `ContentPanel` itself, so the skeleton puts no `h2` on the page.
  - **CF-R4, labels nobody reads (CF-4).** A label prop the form never reads goes with its type line and its keys in one commit; the description and neighbour labels stay.
  - **CF-R5, words instead of English codes (CF-5).**
    - The words come through the labels the page builds (the existing `advancedSettingCount` pattern: `t(key, { count: "{count}" })`, then `.replace` in the form), so the form and the builder stay server-fed and label-driven.
    - th: the modes "ดูตัวอย่างเท่านั้น" / "กดซิงก์เอง" / "ซิงก์ตามรอบเวลา" (the words of `ldapSyncRecommendation` and `ldapSyncHistoryDescription`; glossary: Preview → ตัวอย่าง, Sync → ซิงก์), "{count} วัน", "{months} เดือน"; en "Preview" / "Manual" / "Scheduled", "{count} days", "{months} months".
    - The overview badge names the saved mode; a code the labels do not know shows as it is (glossary: "รหัสที่ยังไม่มีคำแปลแสดงตามจริง ไม่ซ่อน"), and the default stays `preview`.
    - Day numbers stay as typed (they are setting strings; `formatCount` would turn "3650" into "3,650"); the legacy rule months go through `formatCount` (a count, plan 2D-4 R7).
    - "SLA" stays: the Thai settings labels use it (`workflowApprovalSlaDays`), glossary §2.3 allows technical terms on admin pages. The URL path `/q/a/{assetId}`, the sample prefix "COM" and the label size "x … mm" stay.
  - **CF-R6, the integration loading line (CF-6).** Thai only, "กำลังโหลดรายการ"; the en text stays; `loadFailed` becomes "โหลดรายการไม่สำเร็จ" in the same commit, its en text stays (the user, 2026-10-17, open issue CF-b).
  - **CF-R7, the option select's live line (CF-7).** The component reads `common` itself (it is a client component; next-intl's provider holds every message), rather than a new prop on seven callers. `loadingLabel` stays a prop (the callers pass it); the en count uses an ICU plural, the th count none (Thai has no plural form; the parity test compares the argument `count` only).
  - **CF-R8, export downloads (CF-8).** `download` on every export link, the M31 attribute order `href`, `download`, `className`: the reports header's two (the 2D-2 check) and, by the user's answer to open issue CF-c (2026-10-17), the findings export and PDF, the round result export, PDF and variance export, the disposal export, the repair export and the register's export menu (export and import template). The draft named six of these; the round result export and PDF and the import template (hrefs held in variables, which `api-links.mjs` does not read) are the same kind of link and go with them. Not taken: the 10 attachment download links (`/api/attachments/:id`, the preview dialog's `downloadHref`): they are not exports, and their route chooses `inline` or `attachment` itself.
  - **CF-R9, which keys go (CF-9).** A key goes only when the namespace-aware search finds no reader, no template or prefix that could build its path or a parent, no whole-object read of a parent, and every leaf collision in a bound file is a data code. The repo's literal-only finder is a lower bound (any matching leaf anywhere counts as a use), so it misses the 72 others; every key it lists beyond the 76 is built at run time and stays. Tests that pin a deleted key change in the same commit (spec §4.1): one (`auditFinding.comparison`). The search script stays outside the repo (open issue CF-d).
- **R3, the shared check and VFG (area VG, Tasks 10–12):**
  - **VG-R1, the check.** Exact both ways (§5.1): a row whose file counts more fails ("move the new site"), fewer fails ("lower the row", "delete the row" at 0), and a counted file with no row fails. A row needs a whole count above 0, kind `permanent` or `phase 3`, a non-empty `why` and `ruling`. Owners (§5.2) may count anything and are never a row. Problems are returned, not asserted, and the guards pass no message to `assert.deepEqual`, so one failure prints every problem with its file.
  - **VG-R2, which VFG rules get a list.** Every rule that had a budget (R1, R7, R2) or skipped a whole file (R3, the mockup sizes; with VG-3 the `leading-4` check) has an EXEMPT list. Rules that already forbid a pattern in every file (focus ring tokens, see-through rings, placeholder color, `rounded-[6px]`, `StatusBadge color=` and the dot helpers, the three class-string rules, emoji) stay `findMatches(…) == []`: an empty EXEMPT list with a better failure message (each match, not a count). The one-font-file check stays exact. The scrim check moves from `c/ui/` to all of `src` (0 sites). File pins of shared parts (`stat-strip.tsx`, `action-bar.tsx`, `segmented.tsx`, `topbar.tsx`, `tab-nav.tsx`, …) are pins, not rules over `src`, and stay.
  - **VG-R3, names.** A list is `<REGEX NAME>_EXEMPT`, except `TABLE_HEADER_FILLS` (§5.5). Plan 2B-1's three temp scripts read it: `p2b1-precheck.mjs` (`objectOf`, plan 2B-1 `:439`–`:446`, called at `:451`), `p2b-budget.mjs` (`block` and `evaluate`, `:634`–`:640` and `:651`–`:657`, called at `:684`) and `p2b1-t22-precheck.mjs` (`objectOf`, `:13625`–`:13631`, called at `:13637`). Each finds `^const TABLE_HEADER_FILLS\b` and evaluates the text after the first `= ` when it sits on one line, so the line stays `const TABLE_HEADER_FILLS: ExemptList = {}` (all three still read `{}`: dry run). The `rule` label is the rule's id (`R1`, `R7`, `R2`, `R3`; `mockup sizes` and `Thai leading` for the two rules without one) and is its key in `EXEMPT_LISTS`.
  - **VG-R4, row texts.** `why` is English, like every comment in the guard files (§5.1's Thai example shows the format; open issue VG-c), and says what the site is and why it stays. No line numbers in `why` or `ruling` (they move; 2A §9.8 #17). `ruling` names the spec or plan ruling that keeps the site, spec rulings as `2A §9.8 #6`, `2D D2`, `2D §5.3`, `phase 1 §15 #6`, plan rulings as `2D-4 R17`, `2B R-q`, `2A I23`. Checked: 2A §9.8 #6 (the six shadows kept on the camera image, a photo and paper), #9 (the bulk bar and the round scan button keep theirs), #12 (`leading-4` removed), 2A §9.5 (the thermal label sizes), 2A I23 (`Kbd` keeps `leading-4`), phase 1 §15 #6 (the round scan button's shadow), 2B `00-synthesis.md` R-q (the register's bulk bar stays for phase 3), plan 2D-4 R17 (the A4 paper).
  - **VG-R5, EXEMPT, not OWNER, for the camera shadows.** `c/ui/scanner-text-input.tsx` is a shared part, but its two shadows exist because the controls float over camera imagery, which §5.3 lists as EXEMPT `permanent`. OWNERS (§5.2) are shared parts whose job is the raw thing itself (`Button`'s own `<button>`, `Field`'s own input). VFG has no owner list.
  - **VG-R6, the phase 3 sum is one test per guard file.** A test file that imports another test file runs that file's tests again in its own process (checked with `node --test`: a file of 1 test importing a file of 2 gave 3 tests alone and 5 beside it), so VFG cannot import FMG's or LFG's lists, nor they VFG's. Each guard file ends with its own phase 3 test over its own lists; VFG's pins 1 site (R2, the register's bulk bar), 2 once Task 25 (NG-8) adds the topbar search clear and checks that every `const …: ExemptList =` of the file is in `EXEMPT_LISTS` exactly once. The plan-wide total is the sum of the three tests, which the docs task writes down (open issue VG-b).
  - **VG-R7, not converted.** `tests/ui-overlay-guards.test.ts` is not one of the three guard files (D13). Its two `allow` callbacks (`text-{tone}-foreground` only in `c/ui/`; `fixed inset-0` only in `c/ui/` and the dashboard shell) are owner scopes of shared parts, not exemptions, and it has no budget.
  - **VG-R8 (VG-3), the report label.** The phone card's label takes the size and weight of the table head it stands for below `md` (13/500), not only a dropped `leading-4`, which would leave a 12px `text-xs` label (DESIGN.md:290 keeps `text-xs` for sidebar and menu headings, the bottom bar and `Kbd`). Its `text-muted-foreground` stays (the head's faint ink is for a header row, the card label sits beside its value). `leading-tight`, `leading-none` and `leading-5` get no new check (VG-a).
- **R4, FMG (area FG, Tasks 13–16, 19):**
  - **FG-R1, which FMG rules get a list.** As VG-R2: every rule that had a budget (GF1, GF2, GF3, GF7, GB1, GD1's cancel label, GD4's reverse, GL1's fixed bars, GL3) has an `EXEMPT` list over all of `src`, `{}` where nothing stays, checked by `exemptProblems` (exact both ways). The rules that let no file keep a site (GF4, GF6, GF8, GB2, GB3, GB4, GD1's literal labels and primitives, GD2, GD3, the GD4 order, GD5, GD6, GL1's sticky footer half, GL2) stay problem lists over all of `src`: that is an empty list with a better message (each site's file and line, and why). The local wrapper `listProblems(id, counts)` only looks up the rule's list and owners.
  - **FG-R2, owners.** An owner is a shared part whose job is that markup (§5.2): `Field` (GF1), the three raw controls (GF2), the field classes (GF3), `Button`'s busy spinner and `SearchField`'s `loading` (GB1). Not owners: `c/ui/scanner-text-input.tsx` (its four spinners are an exact `permanent` row, as VG-R5 keeps its shadows: they are states of a camera control, not the part's reason to exist); the `ActionBar` and the bottom navigation (spec §5.3 lists them as `EXEMPT` `permanent`; an exact count of 1 also stops a second fixed bar inside either file); `c/ui/accessible-dialog.tsx` in GD2 (it defines `AccessibleDialog`; GD2 is a problem list, so its skip stays a skip).
  - **FG-R3, GB3 is one general rule.** A `Button` or `button` with `busy={x}` never reads `x` in its children (word-bounded, so `labels.refreshing` alone does not count). It replaces `BUSY_LABEL_SWAPS` (2D-1 handed it on; all eight swaps were gone) and reads all of `src` (82 busy buttons; the check asserts at least 50 so a reader break cannot pass silently). Not taken: also flagging a label that switches on a term of `disabled` (it would flag the label batch tool's "unavailable" label, `c/assets/asset-label-batch-tool.tsx:359`, which says why a button is off); a raw `<button>` that does work is N3's (Task 25).
  - **FG-R4, the banner moves first** (spec §5.5's second option, in the same commit as the rule so both are green): both refresh buttons are the stale state's busy `Button`; the fresh one is `sm` (the raw one was `h-8`, 2D-4 R6) in a `text-meta` line (R11). The fresh line's success `CheckCircle2` stays: a status mark beside its words, not a tint (the warning `Notice` is the stale state). The `refreshing` label prop and its key go (FG-2), as 2D-1 M8 did for ten busy labels.
  - **FG-R5, GB2 reads every spinner** (FG-3, open issue FG-a): a line with `animate-spin` has `motion-reduce:animate-none`. Line-based, so a spinning `RefreshCw` counts like a `Loader2`; a class split across lines would read as a miss (write it on one line). `tests/spinner-motion-ui.test.ts` (2D-1's stopgap "until 2D-5 widens it") goes. `animate-pulse` is not a spinner and is not checked.
  - **FG-R6, GF5 floors cover all of `src`.** `c/ui/scanner-text-input.tsx` [0, 1, 0] joins (§5.5), and GF5 now reads every file: a file with a `required`, `maxLength` or `minLength` on a control and no row fails ("add it to CONSTRAINT_FLOORS"), so a new form's constraints are protected from its first commit. Floors stay floors, not budgets: a file may add constraints; a row only says what must not disappear. A floor row of a deleted file fails the meta-test.
  - **FG-R7, `STAR_ONLY` stays as it is.** Its three stars (`checkin-form` `t("returnDate")`, `asset-form` `t("licenseTotalSeats")`, `t("componentRole")`) wait for the V track (2C §4.3 F5: adding `required` would start blocking submit, K4), which is neither `permanent` nor `phase 3`, and a per-file count would lose which field is meant. The meta-test now fails when an entry is stale (its field has native `required` or is gone).
  - **FG-R8, the transition lists go.** `BATCH_FILES`, `NEW_2C_FILES`, `MIGRATED_FILES` (64 files), `owned`, `migrated`, `notOwned`, `migratedSources` (spec §5.5 names the first and third) and the empty `PENDING_FOOTER_PARTS` (GD2 now says "every dialog uses the footer part"); the batch group comments (`// 1a` … `// 4`) go from every list.
  - **FG-R9, kinds.** `phase 3` = the three topbar search rows (the raw input, its classes, its two spinners; D2, DH 2D-2 "Phase 3: `c/layout/global-search.tsx`") and the register's bulk bar (D2, 2B R-q). Everything else is `permanent`. No line numbers in `why` or `ruling` (VG-R4); English, like the guard files' comments (VG-c).
  - **FG-R10, test names.** GF1, GF2, GF3, GF7, GB1, GB2, GD2 and the meta-test change their titles (they said "2C", "migrated" or "do not grow", which an exact list no longer means); no document or script quotes an FMG title (checked: `git grep` outside `docs/superpowers`). DESIGN.md's "guard GL1" keeps meaning GL1.
  - **FG-R11, `budgetOverruns` goes last** (FG-5), after every guard file uses the shared check, with the helper comments that spoke of budgets; LG's "whoever converts last decides" lands here.
- **R5, LFG and the list filters (area LG, Tasks 17–18):**
  - **R-LG1, scope (spec §1 point 2 over the 2B comment "src/lib and the API routes are out").** LFG and the list filter rules read all of `src`. Over all of `src` only LV2 changes: 13 more files with 28 typed `"-"` (12 in `src/lib`, one API route), each an `EXEMPT` row `permanent` under 2B R-n, which ruled that `src/lib` and the API keep `"-"`; R-n now decides which sites stay, not which files go uncounted. No `src/lib` file is an owner: none is a shared part drawing what a rule forbids (the formatters count 0 on every rule; `formatDate`'s `return "-"` is not LV2's form, LG-d). LP1 reads all of `src` instead of `D/` (0 either way). Cost: an edit that adds or removes a `"-"` fallback in `src/lib` now touches LFG (open issue LG-b gives the narrower choice).
  - **R-LG2, owners are files (spec §5.2).** The `c/ui/` folder skip of LF1, LS1, LK1 and LN2 becomes the files that hold the thing: LF1 `filter-select.tsx`; LN2 the ten parts that define their own names; LS1 and LK1 none. LH1, LH2 and LB1 keep `HEADER_OWNER`, LN1 `NAV_PRIMITIVES` (both names kept), LT2 and LT3 `data-table.tsx`, LT4 `pagination.tsx`. An owner may count anything and is never a row; LT2, LT4 and three navigation primitives count 0 and stay owners (they say where the thing may live, as the old skips did). L0 checks that each owner exists (the helper does not).
  - **R-LG3, kinds.** `phase 3` is D2's three items only. LFG holds one of them: the login page's `<h1>` (LH1), part of the login frame; the register's bulk bar and the topbar search have no LFG site. Spec §5.3 listed LH1 as "4 permanent"; D2 ("the login page frame"), DESIGN.md `:285` and the old `KEEP` comment ("phase 3, with the login frame") decide (open issue LG-c). The last test pins the row and the sum, 1.
  - **R-LG4, row text.** As area VG (VG-R4): `why` in English, what the site is and why it stays, no line number (the old comments' `:1413`, `:499`, `:97`, `:2136`, `:1202`, `:1204`, `:2390` live in the Inventory only); `ruling` where the decision was made: `2D D2`, `2B R-n`, `2B I11`, `2B §9.4.3` (the `KEEP` table of phase 2B), `2C K23`, `2D-4 R17`. The three separator defaults are `2B R-n` as their `KEEP` comment and plan 2D-2 say. One `EXEMPT` object keyed by rule id, in `COUNTERS` order, `{}` where nothing stays, so `phase3Rows(EXEMPT)` reads every list.
  - **R-LG5, LN1 reader fix.** `jsxAttrValue` returns `page` without quotes for `aria-current="page"`, so the literal form was never counted. `pageCurrent` now also matches the literal attribute (`/\saria-current=(["'])page\1/`); a variable named `page`, `"step"` and `"true"` still do not count (reader case added). Only `c/ui/breadcrumbs.tsx:26`, an owner, gains a count.
  - **R-LG6, titles.** LV1–LV3 drop "on screen" because the rules read `src/lib` and the API; three test names change, nothing that reads them (only old plans quote them).
  - **R-LG7, meta tests.** L9 (`BUDGETS` = `KEEP`) and L10 (`KEEP` = live) are what `exemptProblems` does per rule, so they go. L0 checks that `TITLES`, `COUNTERS` and `EXEMPT` name the same rules in the same order, that every `OWNERS` key is a rule, and that every owner and row path is a real file; the row format and "an owner is never a row" are the helper's. The phase 3 test follows VFG's name and shape (VG-R6: each guard file sums its own). LFG goes from 23 to 22 tests. The 2B helper scripts that edited `BUDGETS`/`KEEP` by name (`p2b1-precheck.mjs`, `p2b-budget.mjs`) were temp-only and are not used after 2B.
  - **R-LG8, list filters.** Item 5 moves from "anything in these 13 files" to "every form in `src`": (a) a filter form (`action` without `onSubmit`, or `FilterSelect` / `FilterFormActions` inside) is `role="search"`; a `SearchField` alone does not make a filter form (three data forms hold one); (b) inside a search form only hidden inputs stay raw; (c) no old filter label anywhere. A raw field elsewhere is FMG GF2's and a local helper LFG LF1's, so nothing is checked twice and the I34 gap closes. Item 6 reads every `FilterFormActions` with the JSX reader. The review queue (`c/admin/asset-state-review-workspace.tsx`, in the old list) has no form: its `FilterSelect`s are shared parts and GF2 guards its raw fields. Counts are sanity floors (`> 10` search forms, `> 5` clear links), not exact, so a new list page needs no test edit.
  - **R-LG9, stale "2D" text in these files.** The LFG header and test message ("phase 2D widens…", "Phase 2D sets every budget to {}"), the list filters comment ("no guard until 2D (I34)") and `c/ui/filter-panel.tsx:38` ("phase 2D moves the default size to 36px") go (spec §1 point 5).
  - **R-LG10, not taken.** No site moves (spec §3.5); LV2's regex does not widen to `return "-"` (LG-d); the reader keeps reading a `<form>` inside a `{/* … */}` JSX comment as a form (harmless here: no `action`, no closing tag, nothing inside); `DashboardPageSkeleton` and the other 2D-2 R14 items are not LFG's.
- **R6, the five new guards (area NG, Tasks 20–27):**
  - **NG-R1, where the five guards live: VFG, together.** D13 keeps three guard files, so no `tests/ui-lock-guards.test.ts`. VFG already reads all of `src`, and VG-2 built its `EXEMPT_LISTS` and phase 3 test for later rules (VG-2 **Interfaces** names §5.4). Four of the five read class names, VFG's subject (tokens, shadows, type); the fifth (raw `<button>`) is a usage rule like VFG's "no caller passes a database color to StatusBadge". FMG and LFG are rewritten in this plan by the FMG and LG areas, whose final text this area cannot anchor on; in VFG the five rules sit in one block before `EXEMPT_LISTS`, with one header. FMG GD3 (no raw `<button>` in a dialog footer) and LFG LT5 (opacity with `pointer-events-none`) stay where they are.
  - **NG-R2, what a raw color is (N1).** Raw: a Tailwind palette color (the 26 palettes of Tailwind 4.2, `mauve`, `olive`, `mist` and `taupe` included) with or without `/NN`; `white` and `black` on any color utility (a white surface is `bg-surface` / `bg-card`, #FFFFFF; white ink on a solid fill is that fill's `-foreground` token: `text-primary-foreground` anywhere, the status ones inside `c/ui` only); a color value written into a class (`bg-[#…]`, `shadow-[…rgba(…)…]`) or a style object. Not raw: tokens, `var(--…)` inside an arbitrary value, `transparent`, `current`. Outside the rule: values that are not class names and cannot read a CSS variable (page metadata, the web manifest, print CSS, canvas strokes, the PDF styles). Kept as `permanent` rows: paper (the A4 document, the label print page, the signature canvas: white whatever the app's colors, and they print), imagery (the camera controls and frames; the attachment preview's black photo stage and white PDF page), and the bell's count dot (white on `bg-danger`, where the token would break `tests/ui-overlay-guards.test.ts`; open issue NG-a). The lit torch and the round scan button move to their tokens (NG-1, NG-2): identical white, so nothing changes on screen.
  - **NG-R3, dashed lines (N2).** `border-`, `divide-` and `outline-` `dashed` / `dotted` (a dotted box is the same empty-state look), not `decoration-*` (an underline style). The two owners are the parts whose job is that line; 2A's list had three more places, all gone at `388d4d5`.
  - **NG-R4, raw buttons (N3).** The count is JSX `<button` tags; `Button` (`Comp = "button"`) and the Radix triggers inside `c/ui` parts do not count. `OWNERS` are the `c/ui` parts whose job is that control (spec §5.2, whose examples are all `c/ui` parts); a raw command inside a `c/ui` file that is not its own control moves to `Button` (the scanner's camera toggle, NG-1); the scanner's camera controls are `EXEMPT` because imagery is a ruled exception, not a part's job (VG-R5). The shell's navigation rows (sidebar group, bottom bar "More") are `EXEMPT` rows with exact counts, not owners, so a new raw button in those big files still fails. The login show-password toggle is `permanent`: a control inside a field's box like `SearchField`'s clear (an owner), kept by 2C plan 4 Task 8, not part of the login page frame that D2 leaves to phase 3 (open issue NG-c). The only `phase 3` row is D2's topbar search clear.
  - **NG-R5, disabled fades (N4).** Any variant chain holding `disabled` before `:opacity-…`. The scanner's zoom and torch lose `disabled:opacity-60` with no other disabled look, as the audit camera's controls (2D-4 Task 19): a zoom change takes a moment, the torch shows its spinner while it switches, and the `disabled` attribute still blocks a double press.
  - **NG-R6, heights at `sm:` (N5).** A button is a `Button`, a raw `<button>`, the element a `Button asChild` styles, or anything styled with `buttonVariants` (DESIGN.md: a link that looks like a button takes `buttonVariants`); class constants that call `buttonVariants` are read by line. Height means `h`, `min-h`, `max-h` and `size`; widths and `max-sm:` are not counted. The login toggle's `sm:` sizes become `md:` (NG-3), which also closes the 640–767px mismatch 2C noted. A link that imitates a button without `buttonVariants` is not read: none is left (Inventory), and D14 adds no sixth guard for it.
  - **NG-R7, the two carried fixes are area CF's.** The help trigger's 44px box and the two-line `StatStrip` foot are Tasks 1 and 2 (CF-1, CF-2; rulings CF-R1, CF-R2, R9). The N3 row of `c/assets/asset-state-help-popover.tsx` keeps its count 1 and its "with a 44px hit area below md" words.
  - **NG-R8, tests and names.** The code tasks pin their files in the new `tests/guard-lock-sweep-ui.test.ts` (LF); each guard's test pins its reader on literal cases first, so a looser or tighter regex fails before any `src` count does. Rule labels are `N1`–`N5`, the same as their `EXEMPT_LISTS` keys (VG-R3); the lists are `<REGEX NAME>_EXEMPT`, the owner lists `<REGEX NAME>_OWNERS`. Row texts follow VG-R4 (English `why`, no line numbers); rulings name the plan rulings that keep each site: 2D-4 R5 / R17, 2D-3 R5, 2D-2 R10 / R11, 2C plan 4 Task 8, 2A §9.5, 2A §9.8 #11, spec §5.3, and this area's NG-R2 and NG-R4, which three rows quote as "2D-5 NG-R2" / "2D-5 NG-R4" (R6 keeps those ids, R9).
- **R7, the docs (area DC, Tasks 28–30, 32):**
  - **DC-R1, history stays history.** The dated sections of `DEVELOPER_HANDOFF.md` (2A to 2D-4) and the changelog entries keep their "until 2D" and "wait for 2D-5's …" wording (13 lines in the handoff, Inventory A): they record what was true and planned on their date. The 2D-5 section closes them in one sentence, as the UI Shell Milestone's superseded note does. The one exception is the count spec §8 ruling 2 names (H2), in a section written after the count had changed. The phrase test therefore reads only `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md` and `.impeccable/design.json` (open issue DC-a).
  - **DC-R2, what the docs count.** The docs name rules, lists, owners and kinds and point at the guard's `EXEMPT` list; they give a number only where spec §5.3 fixes it and the count at `388d4d5` matches: R2's 8 shadows (7 `permanent`, 1 `phase 3`) and GF2's fields (the label print toolbar 2 and the room search 1 `permanent`, the topbar search `phase 3`). A later row change then never makes `DESIGN.md` wrong, and history counts (2B, 2C) stay as written. The total of the `phase 3` sites goes into the dated handoff and changelog (`<P3>`), not into `DESIGN.md` (open issue DC-d).
  - **DC-R3, one docs test file.** `tests/phase2d-docs.test.ts` (LF, new) holds the four docs tests, one per docs commit, apart from the code sweep tests of the other areas. Its phrase list is spec §1 point 5's two phrases plus the near forms found at `388d4d5`. Past-tense uses inside the three docs are rewritten, not exempted, so the list stays simple (D3).
  - **DC-R4, `.impeccable/design.json` is a mirror.** It follows `DESIGN.md` and the code: the css examples take the sizes of `c/ui/button-variants.ts` and the font stack of `src/app/layout.tsx`; `dos[0]` and the two new `donts` take `DESIGN.md` §6; nothing is added that `DESIGN.md` does not say. `generatedAt` becomes the commit date. Its format stays (2-space JSON, LF, one line per css string).
  - **DC-R5, the registry row.** The phase 2D spec gets a Current-Surface Registry row in docs/14, as the 2A, 2B and 2C specs have, naming its five plans; the plan 5 link is this plan's file name.
  - **DC-R6, robust sentences.** Where another area of this plan decides the detail (which raw colors or raw buttons stay, how the foot clamps), the DC sentence states the rule and gives examples with "such as"; DC-1 Step 3 checks the facts each sentence states before the commit, and a failed check stops the task instead of changing the sentence.
  - **DC-R7, Thai wording.** The changelog entry uses the glossary words and keeps code names (`EXEMPT`, `OWNERS`, `permanent`, `phase 3`, guard ids) as the 2D-1 to 2D-4 entries do; "รายการยกเว้น" for the `EXEMPT` list (spec §5.1's heading), "ชิ้นส่วนกลาง" for the shared parts, "แถบตัวเลข" for `StatStrip`, "ประเภท" (not "ป้าย", which means a label) for the kind.
  - **DC-R8, order.** DC-1 to DC-3 after every code and guard task; DC-4 after the controller's verify and dev-app task and before its final task.

- **R8, every `EXEMPT` row of every rule, and the phase 3 total** (spec §5.1, §5.3, D1, D2). These are all the rows the lock keeps, exactly as the guard tasks write them (the table is generated from their code blocks; a task's block is the source of truth). Rules not listed have `EXEMPT` `{}`: VFG R1 (`TONE_OPACITY_EXEMPT`), R7 (`TABLE_HEADER_FILLS`), N2, N4, N5; FMG GF1, GF7, GD1, GD4, GL3; LFG LH2, LP1, LF1, LT1–LT5, LV1, LV3, LS1, LS2, LK1, LN2, LR1. Every other check of the three files and the list filters allows no site at all.
  - **Totals:** VFG 35 rows, 111 sites; FMG 20 rows, 27 sites; LFG 32 rows, 67 sites; **87 rows holding 205 sites**.
  - **Phase 3 (D2):** 7 rows holding **8 sites in 3 files**: the register's bulk selection bar (`c/assets/asset-register-table.tsx`: VFG R2, FMG GL1), the topbar search (`c/layout/global-search.tsx`: FMG GF2, GF3, GB1 ×2, VFG N3) and the login page frame (`src/app/[locale]/(auth)/login/page.tsx`: LFG LH1). Each guard file's last test pins its own (VFG 2, FMG 5, LFG 1; VG-R6); Task 32 writes the total into the handoff and the changelog.
  - **`OWNERS`** (shared parts that may count anything and are never a row, spec §5.2): VFG N2 `c/ui/file-dropzone.tsx`, `c/asset-operations/signature-pad.tsx`; N3 `c/ui/row-actions.tsx`, `search-field.tsx`, `searchable-select.tsx`, `segmented.tsx`. FMG GF1 `c/ui/field.tsx`; GF2 `c/ui/input.tsx`, `native-select.tsx`, `textarea.tsx`; GF3 `c/ui/field-variants.ts`; GB1 `c/ui/button.tsx`, `search-field.tsx`. LFG LH1, LH2, LB1 `c/ui/page-header.tsx` (`HEADER_OWNER`); LF1 `c/ui/filter-select.tsx`; LT2, LT3 `c/ui/data-table.tsx`; LT4 `c/ui/pagination.tsx`; LN1 the 7 `NAV_PRIMITIVES`; LN2 the 10 `c/ui` parts that define the shared names.
  - **Floors, not rows:** FMG `CONSTRAINT_FLOORS` (39 files, `c/ui/scanner-text-input.tsx` [0, 1, 0] new) and `STAR_ONLY` (3 stars for the V track).

| Guard | Rule (task) | File | Count | Kind | Why | Ruling |
|---|---|---|---|---|---|---|
| VFG | R2 (Task 11) | `c/ui/scanner-text-input.tsx` | 2 | permanent | the zoom group and the torch button float over the live camera image | 2A §9.8 #6, 2D §5.3 |
| VFG | R2 (Task 11) | `c/audit/audit-scan-check-form.tsx` | 1 | permanent | the remove button floats over a photo thumbnail | 2A §9.8 #6, 2D §5.3 |
| VFG | R2 (Task 11) | `c/assets/asset-label-print.tsx` | 1 | permanent | the label sheet preview stands for the paper | 2A §9.8 #6, 2D §5.3 |
| VFG | R2 (Task 11) | `c/asset-operations/operation-document-print.tsx` | 1 | permanent | the A4 page preview stands for the paper | 2A §9.8 #6, 2D-4 R17 |
| VFG | R2 (Task 11) | `c/admin/system-settings-form.tsx` | 1 | permanent | the label sample of the label settings stands for the paper | 2A §9.8 #6, 2D §5.3 |
| VFG | R2 (Task 11) | `c/layout/mobile-field-navigation.tsx` | 1 | permanent | the round scan button lifts out of the bottom bar | phase 1 §15 #6, 2A §9.8 #9 |
| VFG | R2 (Task 11) | `c/assets/asset-register-table.tsx` | 1 | **phase 3** | the phone bulk-action bar floats over the list, with its frame and place | 2D D2, 2B R-q |
| VFG | R3 (Task 11) | `c/assets/asset-label-print.tsx` | 3 | permanent | the thermal label's name and detail lines print at their physical size | 2A §9.5 |
| VFG | mockup sizes (Task 11) | `c/assets/asset-label-print.tsx` | 1 | permanent | the thermal label's name line on the large tape prints at its physical size | 2A §9.5 |
| VFG | Thai leading (Task 12) | `c/ui/kbd.tsx` | 1 | permanent | a Kbd holds only Latin key names and arrows, never Thai text | 2A I23 |
| VFG | N1 (Task 23) | `c/asset-operations/operation-document-print.tsx` | 19 | permanent | the A4 paper: slate ink and lines on white, and the red void watermark | 2D §5.3, 2D-4 R17 |
| VFG | N1 (Task 23) | `c/asset-operations/signature-pad.tsx` | 1 | permanent | the signature canvas is white paper, and the signature prints | 2D-4 R17 |
| VFG | N1 (Task 23) | `c/assets/asset-label-print.tsx` | 12 | permanent | the label sheet prints black on white at its physical size | 2D §5.3, 2A §9.5 |
| VFG | N1 (Task 23) | `c/audit/audit-scan-camera.tsx` | 12 | permanent | the zoom, torch and stop controls on the camera image: a dark fill with white ink | 2D §5.3, 2D-4 R17 |
| VFG | N1 (Task 23) | `c/audit/audit-scan-panels.tsx` | 5 | permanent | the scan frame on the camera image: its dim surround and white corners | 2D §5.3, 2D-4 R17 |
| VFG | N1 (Task 23) | `c/layout/topbar.tsx` | 1 | permanent | the bell's unread count is white on the solid danger dot; a status -foreground token stays inside src/components/ui | 2A §9.8 #11, 2D-5 NG-R2 |
| VFG | N1 (Task 23) | `c/ui/attachment-preview-dialog.tsx` | 2 | permanent | the preview stage: black around a photo, white paper under a PDF page | 2D §5.3, 2D-5 NG-R2 |
| VFG | N1 (Task 23) | `c/ui/scanner-text-input.tsx` | 22 | permanent | the zoom and torch controls and the QR and serial scan frames on the camera image | 2D §5.3, 2D-4 R17 |
| VFG | N3 (Task 25) | `c/assets/asset-attachments.tsx` | 3 | permanent | the photo is the control: the checklist, gallery and evidence photos open their preview | 2D-3 R5 |
| VFG | N3 (Task 25) | `c/assets/asset-component-manager.tsx` | 1 | permanent | a candidate row: a pressed list option of two lines | 2D-3 R5 |
| VFG | N3 (Task 25) | `c/assets/asset-label-batch-tool.tsx` | 2 | permanent | the search result and recent queue rows: two lines that add the asset to the print list | 2D-3 R5 |
| VFG | N3 (Task 25) | `c/assets/asset-state-help-popover.tsx` | 1 | permanent | the 24px help circle in a field label row or a table head, with a 44px hit area below md | 2D-3 R5, the user 2026-10-16 |
| VFG | N3 (Task 25) | `c/assets/asset-thumbnail.tsx` | 1 | permanent | the thumbnail image is the control that opens the photo | 2D-3 R5 |
| VFG | N3 (Task 25) | `c/audit/audit-scan-camera.tsx` | 3 | permanent | zoom, torch and stop on the camera image, with their own dark fill and white ink | 2D-4 R5 |
| VFG | N3 (Task 25) | `c/audit/audit-scan-lookup-card.tsx` | 1 | permanent | a two-line register match that opens it | 2D-4 R5 |
| VFG | N3 (Task 25) | `c/audit/audit-scan-room-list.tsx` | 1 | permanent | the whole row of two to four lines opens the check sheet | 2D-4 R5 |
| VFG | N3 (Task 25) | `c/audit/audit-scan-room-picker.tsx` | 2 | permanent | the two-line room trigger under SheetTrigger asChild and the pressed room option | 2D-4 R5 |
| VFG | N3 (Task 25) | `c/audit/audit-scan-search.tsx` | 1 | permanent | the whole result row opens the check sheet | 2D-4 R5 |
| VFG | N3 (Task 25) | `c/auth/login-form.tsx` | 1 | permanent | the show-password toggle inside the password field, as SearchField's own clear button | 2C plan 4 Task 8, 2D-5 NG-R4 |
| VFG | N3 (Task 25) | `c/disposal/disposal-asset-picker.tsx` | 1 | permanent | a listbox option with its own check box and two lines | 2D-4 R5 |
| VFG | N3 (Task 25) | `c/layout/global-search.tsx` | 1 | **phase 3** | the clear button of the topbar search, which phase 3 redoes | 2D D2, 2D-2 R10 |
| VFG | N3 (Task 25) | `c/layout/mobile-field-navigation.tsx` | 1 | permanent | the bottom bar's More item: a navigation item that opens the drawer, styled as its sibling links | 2D-2 R11 |
| VFG | N3 (Task 25) | `c/layout/sidebar.tsx` | 1 | permanent | a sidebar group row that opens and closes its group, styled as the navigation rows | 2D-2 R11 |
| VFG | N3 (Task 25) | `c/maintenance/maintenance-attachments.tsx` | 1 | permanent | the image or the PDF preview is the control | 2D-4 R5 |
| VFG | N3 (Task 25) | `c/ui/scanner-text-input.tsx` | 2 | permanent | zoom and torch on the camera image, as the audit camera's | 2D-4 R5, R17 |
| FMG | GF2 (Task 16) | `c/assets/asset-label-print.tsx` | 2 | permanent | the print toolbar's two boxed fields, the print reason and the tape size: the label box carries the field look | 2C K21 |
| FMG | GF2 (Task 16) | `c/audit/audit-scan-room-picker.tsx` | 1 | permanent | the room search at the top of the room sheet | 2C O20 |
| FMG | GF2 (Task 16) | `c/layout/global-search.tsx` | 1 | **phase 3** | the topbar search combobox | 2D D2 |
| FMG | GF3 (Task 16) | `c/layout/global-search.tsx` | 1 | **phase 3** | the topbar search combobox's own field classes | 2D D2 |
| FMG | GB1 (Task 16) | `c/admin/IntegrationClientManager.tsx` | 1 | permanent | the loading status in the client list head | 2C I27 |
| FMG | GB1 (Task 16) | `c/asset-operations/transaction-cancel-dialog.tsx` | 1 | permanent | the loading line in the dialog body | 2C I27 |
| FMG | GB1 (Task 16) | `c/assets/asset-component-manager.tsx` | 1 | permanent | the searching status line | 2C I27 |
| FMG | GB1 (Task 16) | `c/assets/asset-label-batch-tool.tsx` | 2 | permanent | the loading lines of the search results and of the recent queue | 2C I27 |
| FMG | GB1 (Task 16) | `c/assets/asset-scan-search-tool.tsx` | 1 | permanent | the loading line of the results | 2C I27 |
| FMG | GB1 (Task 16) | `c/audit/audit-scan-camera.tsx` | 1 | permanent | the spinner on the camera box while the camera starts | 2C I27 |
| FMG | GB1 (Task 16) | `c/audit/audit-scan-check-form.tsx` | 1 | permanent | the components loading line of the check sheet | 2C I27 |
| FMG | GB1 (Task 16) | `c/audit/audit-scan-lookup-card.tsx` | 1 | permanent | the register search status line | 2C I27 |
| FMG | GB1 (Task 16) | `c/disposal/disposal-asset-picker.tsx` | 1 | permanent | the spinner inside the picker's search field | 2C I27 |
| FMG | GB1 (Task 16) | `c/disposal/disposal-bulk-approval.tsx` | 2 | permanent | the preview and commit status lines in the dialog body | 2C I27 |
| FMG | GB1 (Task 16) | `c/disposal/disposal-bulk-execution.tsx` | 1 | permanent | BusyLabel, the status line in the dialog body | 2C I27 |
| FMG | GB1 (Task 16) | `c/layout/global-search.tsx` | 2 | **phase 3** | the topbar search: the spinner in its field and its results loading line | 2D D2 |
| FMG | GB1 (Task 16) | `c/ui/scanner-text-input.tsx` | 4 | permanent | the shared scanner while the camera starts or the torch switches: the start and torch buttons, the line on the camera image and the line under it | 2C I27 |
| FMG | GL1 (Task 16) | `c/assets/asset-register-table.tsx` | 1 | **phase 3** | the register's phone bulk-action bar | 2D D2, 2B R-q |
| FMG | GL1 (Task 16) | `c/layout/mobile-field-navigation.tsx` | 1 | permanent | the phone bottom navigation | 2D §5.3 |
| FMG | GL1 (Task 16) | `c/ui/action-bar.tsx` | 1 | permanent | the phone ActionBar of the four detail pages | 2C K23 |
| LFG | LH1 (Task 17) | `src/app/[locale]/(auth)/login/page.tsx` | 1 | **phase 3** | the login page has no shell; its title belongs to the login frame that phase 3 redoes | 2D D2 |
| LFG | LH1 (Task 17) | `c/asset-operations/operation-document-print.tsx` | 1 | permanent | the A4 document's own title, printed on the paper | 2D-4 R17 |
| LFG | LH1 (Task 17) | `c/assets/asset-label-print.tsx` | 1 | permanent | the label print page has no shell: its own title above the label preview | 2B §9.4.3 |
| LFG | LH1 (Task 17) | `c/audit/audit-scan-header.tsx` | 1 | permanent | the field scan header, its own one-line variant | 2B §9.4.3 |
| LFG | LB1 (Task 17) | `c/admin/system-settings-form.tsx` | 1 | permanent | the arrow of the category transfer list's remove button, not a page back | 2B §9.4.3 |
| LFG | LB1 (Task 17) | `D/audit/rounds/[id]/page.tsx` | 1 | permanent | the back item of the round's ActionBar | 2C K23 |
| LFG | LB1 (Task 17) | `c/audit/audit-scan-header.tsx` | 1 | permanent | the field scan header's back link, its own one-line variant | 2B §9.4.3 |
| LFG | LB1 (Task 17) | `c/disposal/disposal-batch-form.tsx` | 1 | permanent | back to editing in the review step, not a page back | 2B §9.4.3 |
| LFG | LV2 (Task 17) | `D/asset-management/labels/page.tsx` | 4 | permanent | label data: the category, state and location the label prints | 2B R-n |
| LFG | LV2 (Task 17) | `D/assets/[id]/page.tsx` | 4 | permanent | translated-sentence arguments: the parent's tag in the two relationship summaries and the from and to values of the history sentence | 2B R-n |
| LFG | LV2 (Task 17) | `P/asset-management/checkins/[id]/page.tsx` | 2 | permanent | print page: the A4 check-in document | 2B R-n |
| LFG | LV2 (Task 17) | `P/asset-management/checkouts/[id]/page.tsx` | 4 | permanent | print page: the A4 check-out document | 2B R-n |
| LFG | LV2 (Task 17) | `c/admin/system-settings-form.tsx` | 1 | permanent | the default separator of the asset tag preview, not an empty value | 2B R-n |
| LFG | LV2 (Task 17) | `c/asset-operations/operation-document-print.tsx` | 1 | permanent | an empty field on the A4 document | 2D-4 R17 |
| LFG | LV2 (Task 17) | `c/asset-operations/void-document-banner.tsx` | 3 | permanent | the void banner prints on the A4 document | 2D-4 R17 |
| LFG | LV2 (Task 17) | `c/assets/asset-label-batch-tool.tsx` | 6 | permanent | label data: the category, state, company, branch and location the label prints | 2B R-n |
| LFG | LV2 (Task 17) | `c/audit/audit-scan-check-form.tsx` | 3 | permanent | translated-sentence arguments: the checker's name and the check time | 2B R-n |
| LFG | LV2 (Task 17) | `c/audit/audit-scan-offline-bar.tsx` | 1 | permanent | the sync error inside a translated sentence | 2B R-n |
| LFG | LV2 (Task 17) | `src/app/api/disposal-requests/bulk-decision/route.ts` | 1 | permanent | the API's stand-in asset tag for a request it cannot find | 2B R-n |
| LFG | LV2 (Task 17) | `src/lib/asset-cross-scope.ts` | 5 | permanent | server-built summary rows: the custodian, its company and branch, the home location and its branch | 2B R-n |
| LFG | LV2 (Task 17) | `src/lib/asset-import-history.ts` | 3 | permanent | server-built import history: the batch id, the file name and the approver | 2B R-n |
| LFG | LV2 (Task 17) | `src/lib/asset-operation-options.ts` | 1 | permanent | the custodian label of a legacy return candidate, built on the server | 2B R-n |
| LFG | LV2 (Task 17) | `src/lib/asset-tag.ts` | 1 | permanent | the asset tag separator's default, not an empty value | 2B R-n |
| LFG | LV2 (Task 17) | `src/lib/audit-correction-history.ts` | 1 | permanent | the correction's user name, an argument of a translated sentence | 2B R-n |
| LFG | LV2 (Task 17) | `src/lib/audit-pdf.tsx` | 1 | permanent | an empty cell of the audit PDF | 2B R-n |
| LFG | LV2 (Task 17) | `src/lib/disposal-approval-service.ts` | 2 | permanent | the stand-in asset tag of a request that cannot be found | 2B R-n |
| LFG | LV2 (Task 17) | `src/lib/integration-auth.ts` | 1 | permanent | a server log line | 2B R-n |
| LFG | LV2 (Task 17) | `src/lib/ldap-sync.ts` | 3 | permanent | the parts of an English LDAP sync blocker message | 2B R-n |
| LFG | LV2 (Task 17) | `src/lib/production-readiness.ts` | 6 | permanent | readiness check values, server-built text such as the two auth URLs in one line | 2B R-n |
| LFG | LV2 (Task 17) | `src/lib/system-log-presenter.ts` | 2 | permanent | the system log's user and record labels; the dashboard reads the "-" user as the system user | 2B R-n |
| LFG | LV2 (Task 17) | `src/lib/system-setting-defaults.ts` | 1 | permanent | the default asset tag separator setting, not an empty value | 2B R-n |
| LFG | LN1 (Task 17) | `D/master-data/brands/page.tsx` | 2 | permanent | the brand picker is a vertical list of links, where aria-current="page" is right | 2B I11 |

- **R9, assembly decisions** (where two area drafts touched the same thing, or an order had to move):
  - **One owner per overlapping edit.** The help trigger's 44px box is Task 1 (CF-1, the asymmetric box of CF-R1; the centred `after:-inset-2.5` of the new-guard draft is the alternative of open issue CF-a). The two-line `StatStrip` foot is Task 2 (CF-2: the icon in a `flex h-5` box and `break-words`; the draft's `mt-0.75` icon is not taken). The findings banner is Task 13 (FG-1); the scanner input's two in-button spinners are Task 15 (FG-3). Task 20 (NG-1) edits none of these lines. The NG draft's tasks NG-4 and NG-5 are therefore not in this plan, and its ids NG-6 to NG-10 stay as they are.
  - **FG-5 runs after LG-2** (Task 19): it deletes `budgetOverruns`, which LFG calls until Task 17.
  - **`tests/guard-lock-sweep-ui.test.ts`** holds the three NG code tasks only; its header comment no longer names the carried fixes (Task 20's Step 1 block).
  - **Ruling strings in rows** stay as the areas wrote them (`2D D2`, `2B R-n`, `2D-4 R17`, `2C K21` …); "2D-5 NG-R2" and "2D-5 NG-R4" name R6's NG-R2 and NG-R4. `why` texts are English (open issue VG-c).
  - **Counts in "Step 5"** are chained in this plan's order; the areas' dry runs counted their own area first, so each Step 5 also states its delta.
  - **Task 32 (DC-4)'s `<from plan: …>` markers** are filled here from Tasks 1–27; its implementer fills only `<today>`, `<N>`, `<P3>`, `<P3F>` and the findings markers.

## Review Focus

Five inputs or failure modes that would bite a person. Each is held by a test in its owning task's Step 1 block (named below), and Task 31 checks it on the app.

1. **A finger on a phone (Task 1, CF-1).** The help circle's 44px box sits in a field's label row: centred, it would cover the top 6px of the select the label names, and a tap there would open the help instead of the select. The box grows 16px up and 4px down and is off from `md`. **Test:** "the asset state help trigger stays a 24px circle and gets a 44px hit area below md (the user, 2026-10-17)" (the tokens `after:-top-4`, `after:-bottom-1`, `md:after:hidden`; the circle itself does not grow; every caller unchanged). Task 31: at 375 a tap just above or beside the circle opens the help, a tap on the select under it opens the select.
2. **A long label on a phone (Task 2, CF-2).** A `StatStrip` foot that wraps to two lines must not push its value out of line with the other cells, and a long code must not overflow the cell. **Test:** "a StatStrip foot wraps to two lines before its ellipsis, and the label, value and foot rows stay aligned (the user, 2026-10-17)" (`line-clamp-2 break-words`, `footTitle` kept, the three-row subgrid kept, the icon on the first line). Task 31: `/th/audit/rounds` at 375 and `/th/dashboard` at 375 and 1440.
3. **A busy or disabled action (Task 13, FG-1; Task 20, NG-1).** The findings page's fresh-data refresh is clicked while the page refreshes: it must keep focus and its label and not fade; the scanner's zoom and torch lose their fade but keep `disabled`. **Tests:** "DataFreshnessBanner: both refresh buttons are busy Buttons that keep their label (2C K13, spec 2D §5.5)" (no `disabled`, no `<button`, no swapped label) and "scanner input: the camera toggle is an outline lg Button, and the controls on the camera image never fade when disabled (spec 2D §5.4 items 1, 3, 4)" (`disabled={disabled}` stays on the toggle; no `disabled:opacity`). Task 31: the refresh at 1440 and 375 (focus stays, label stays, only GET requests).
4. **Thai text on Thai pages (Tasks 5 and 7, CF-5, CF-7).** The settings screens and the option select's live line must read Thai on `/th`, and English only on `/en`, with the numbers as typed. **Tests:** "the settings screens name the LDAP sync modes, the legacy rules' months and the overview's day counts in words (plan 2D-2 R14)" (every new th value Thai with no Latin letter; no `}d` suffix; no `>Preview<`) and "the maintenance option select announces loading and its result count from messages, never in English (plan 2D-4 open issue 10 c)". Task 31: the Thai and the English pass of `/admin/settings` and `/maintenance/new`.
5. **Print output, and Dark Mode next (Task 23, NG-6).** The A4 document, the label sheet and the signature canvas keep raw white and slate because they are paper; a later "fix" that turns them into theme tokens would print the app's colors (and, after Dark Mode, dark paper). **Test:** "N1 colors come from the tokens, outside the paper and the camera imagery (spec 2D §5.4 item 1)": each paper row holds its exact count, so a site that moves to a token fails "fewer than its EXEMPT count". Task 31: print preview of a check-out document and the label print page.

## File structure

| File | What changes | Task |
|---|---|---|
| `c/assets/asset-state-help-popover.tsx` | a 44px `::after` target below `md`, the 24px circle kept | 1 |
| `c/ui/stat-strip.tsx` | feet of up to two lines, the warning icon on the first | 2 |
| `c/ui/page-skeleton.tsx` | the dashboard skeleton in the page's shape | 3 |
| `D/admin/settings/page.tsx`, `c/admin/system-settings-form.tsx`, `c/admin/depreciation-policy-builder.tsx` | four unread labels go; LDAP sync modes, day counts and legacy months in words | 4, 5 |
| `messages/th.json`, `messages/en.json` | the keys of "Messages" | 4–7, 9, 14 |
| `c/maintenance/maintenance-option-select.tsx` | the live line from `common` | 7 |
| `D/reports/page.tsx`, `D/audit/findings/page.tsx`, `D/audit/rounds/[id]/page.tsx`, `D/disposal/page.tsx`, `D/maintenance/page.tsx`, `c/assets/asset-register-export-menu.tsx` | every export link `download` | 8 |
| `tests/helpers/guard-exempt.ts` (new) | the shared `EXEMPT` check | 10 |
| `tests/visual-foundation-guards.test.ts` | exact `EXEMPT` lists, the phase 3 test, `leading-4` over all of `src`, N1–N5 | 11, 12, 23–27 |
| `c/reports/responsive-report-list.tsx` | the phone card label `text-meta` | 12 |
| `c/ui/data-freshness-banner.tsx`, `D/audit/findings/page.tsx` | both refreshes busy `Button`s that keep their label | 13 |
| `c/ui/scanner-text-input.tsx` | the two in-button spinners stop under reduced motion · the camera toggle a `Button`, no disabled fades, the lit torch's token | 15 · 20 |
| `tests/form-migration-guards.test.ts` | GB3 general, GB2 every spinner, then the lock | 13, 15, 16 |
| `tests/list-frame-guards.test.ts` | the lock | 17 |
| `tests/list-filters-ui.test.ts`, `c/ui/filter-panel.tsx` (comment) | items 5 and 6 over all of `src` | 18 |
| `tests/helpers/source-files.ts` | `budgetOverruns` deleted | 19 |
| `c/layout/mobile-field-navigation.tsx` · `c/auth/login-form.tsx` | the scan button's ink token · the show-password toggle's sizes at `md` | 21 · 22 |
| `DESIGN.md` · `docs/14_UI_UX_DESIGN_SYSTEM.md` · `.impeccable/design.json` | the last docs pass | 28 · 29 · 30 |
| `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` | this plan's section and entry | 32 (and 33: the verify bullets) |
| `tests/*` | four new files, one deleted (`tests/spinner-motion-ui.test.ts`), pins edited with their file | 1–30, 32 |

No change (checked): every other `src` file; the API, `prisma/`, `scripts/` (the namespace-aware key search stays in `<tools>`, open issue CF-d), `src/app/globals.css`, `tests/ui-overlay-guards.test.ts` (VG-R7), `tests/design-tokens-contrast.test.ts`, `docs/11_FEATURE_LIST.md`, `docs/07_UAT_CHECKLIST.md`.

---

### Task 0: Branch, baseline, counting evidence and before evidence (controller runs this task, not an implementer)

**Files:**
- Create then delete: a launch configuration for the dev server only while it runs; never committed. If `.claude/launch.json` already holds another session's configuration, add your own entry with its own name and port, and remove only that entry afterwards.
- Evidence: `.superpowers/sdd/screenshots/ui-phase2d-plan5/before/`, `.superpowers/sdd/ui-phase2d-plan5/task-0-baseline.md` and `.superpowers/sdd/ui-phase2d-plan5/task-0-counts/` (git-ignored).

**Interfaces:**
- Consumes: `feat/ui-phase2d-plan5` at the plan commit (on `388d4d5`).
- Produces: the baseline numbers, the counting scripts' output, the before measurements and images, which Task 31 compares against.

- [ ] **Step 1: Branch and base.**
  - `git rev-parse --abbrev-ref HEAD` → `feat/ui-phase2d-plan5`.
  - `git merge-base --is-ancestor 388d4d5 HEAD && git diff --quiet 388d4d5 HEAD -- src tests messages scripts prisma DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md .impeccable/design.json && echo BASE-OK` → `BASE-OK`; `git diff --name-only 388d4d5 HEAD` lists only this plan (`docs/superpowers/plans/2026-10-17-ui-phase2d-plan5.md`).
  - `git status --short` → only the untracked folders and files of the Global Constraints.
- [ ] **Step 2: Baseline.** `npm test` (expected 2159 tests, 2158 pass, 0 fail, 1 skipped), `npx tsc --noEmit` (clean), `npm run lint` (0 errors; 146 warnings, every one under `.agents/`). Record the numbers in `task-0-baseline.md`.
- [ ] **Step 3: Temp scripts.** Check that `<tools>/eol.mjs` (Global Constraints) and the counting scripts of Step 4 exist; hand the paths of `<temp>` and `<tools>` to every implementer.
- [ ] **Step 4: Counting evidence at `388d4d5`.** From the repo root, save each script's output under `task-0-counts/` (each only reads `src`, `messages` and `tests/helpers/source-files.ts`), and check the headline numbers against the inventories of the areas; a difference stops the plan (an inventory row would be wrong):
  - `node <tools>/vg2-count.mjs .` → `vfg.txt` (R2 8 shadows in 7 files, R3 3 and the mockup size 1 in the label print, `leading-4` in two class strings);
  - `node <tools>/fg-count.mts` → `fmg.txt` (GF2 7 in 6 files, GF3 4 in 2, GB1 21 in 15, GL1 fixed bars 3; GF5 39 files with a constraint);
  - `node <tools>/lg-verify.mts` → `lfg.txt` (LH1 4, LB1 4, LV2 57 in 23 files, LN1 2) and `node <tools>/lg-filters-verify.mts` → `list-filters.txt` (14 search forms, 11 `FilterFormActions`);
  - `node <tools>/ng-final.mts --sites` → `new-guards.txt` (N1 76 in 9 files, N2 2 in 2, N3 33 in 22, N4 3 in 2, N5 1 in 1);
  - `node <tools>/unused-message-keys.mjs D:/Antigravity/asset-system` → `unused-keys.txt` (`keys 4137 · unused 76`) and `node scripts/find-unused-messages.mjs` → `find-unused.txt` (192 keys);
  - `node <tools>/api-links.mjs D:/Antigravity/asset-system` → `api-links.txt` (25 `<a>` to `/api` or an export href, 18 without `download`: 8 export links and 10 attachment links; the script does not see the round result export and PDF or the import template, which Task 8 also changes).
- [ ] **Step 5: Dev server.**
  - If `preview_list` shows a dev server of this checkout on `:3000`, use it and do not stop it. Otherwise add a launch configuration `name: "asset-2d5-dev-3100"`, `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "dev", "-p", "3100"]`, `port: 3100`, `autoPort: false` (if another session's server holds 3100, use 3102 and say so in the baseline file), and start it with `preview_start`.
  - Memory says `.env` points at `asset_management_dev` / `asset_dev`. Confirm this without opening the file: `/th/admin/readiness` shows the database checks. If anything suggests the production database, stop.
  - Log in with the seed admin of `prisma/seed.ts`; do not echo the password. Use your own browser tab.
- [ ] **Step 6: Before measurements** (Task 31 repeats them; write nothing):
  - the help trigger at 375 on `/th/assets/new` (status and condition) and in the register's filter sheet: the button's rectangle (24 × 24) and the rectangle of the select under it;
  - `StatStrip` feet at 375 on `/th/audit/rounds` and `/th/dashboard`: for each foot `span`, `scrollWidth > clientWidth` (cut) and its `title`;
  - the report phone card labels at 375 on `/th/reports` (a report that shows phone cards): the computed `font-size` and `line-height`;
  - the login show-password toggle at 700 and 1440 (`/th/login` in a private tab, not logged in): its width and height beside the field;
  - the scanner input's camera toggle in the asset form (`/th/assets/new`) at 1440 and 375: its height; the bottom bar's scan button at 375: the icon's color.
- [ ] **Step 7: Before screenshots.** Save to `.superpowers/sdd/screenshots/ui-phase2d-plan5/before/<view>-<width>.png` at 1440, 768 and 375 (open each sheet or dialog to its first screen and close it with ยกเลิก, the X or Esc):
  - the CF pages: `/th/assets/new` (the status and condition labels), `/th/assets` with the filter sheet open (375) and the table head (1440), an asset page's header; `/th/audit/rounds`; `/th/dashboard` (and its loading skeleton, with the network throttled to "Slow 4G" for one load); `/th/admin/settings` (the overview, the LDAP tab with the sync mode select, the accounting tab with legacy rules if the dev data has them); `/th/admin/integrations` (the client list while it loads); `/th/maintenance/new` (the option select with a typed search); `/th/reports` (the header exports and the phone cards);
  - the pages the guard tasks touch: `/th/audit/findings` (the fresh line within five minutes of loading), the asset form's scanner input, the bottom bar at 375, `/th/login` (700 and 1440).
- [ ] **Step 8: Clean up.** Stop your server if you started one and remove your launch configuration (only yours; delete `.claude/launch.json` only if you created the file). `git status --short` shows what Step 1 showed. No commit in this task.

---

## Area CF: the carried fixes, first (Tasks 1–9)

Spec 2D §1 items 1 and 5, §3.5, §8; the fixes plans 2D-1 to 2D-4 handed to the last plan: DH 2D-2 "Not taken (R14 …)" and its "Handed on" (the integration list's loading text), DH 2D-4 "Handed on" and plan 2D-4 R18 (`maintenance-option-select.tsx`'s English live text, open issue 10 c), the 2D-2 dev-app check's "Not caused by this plan" (the report header exports without `download`), the user's rulings of 2026-10-16/17 (the 44px phone target of the asset state help, StatStrip feet of two lines), and a pass over the message keys no code reads. Each fix is one commit with one test appended to the new `tests/phase2d-final-ui.test.ts`; nothing else changes. Codes inside translated sentences wait for phase 3 (the user, 2026-10-17): not in this plan.

Line numbers are of `388d4d5` (CF-5 runs after CF-4, which takes one line out of the same two files in four places; find every site by its quoted text). Counts were taken at `388d4d5` in the clean working tree. The nine tasks ran in order in a copy of that tree (`<temp>/sim-cf`, built by `<tools>/cf/cf-run.sh`): every new test failed first and passed after, the focused tests of each Step 5 passed, the whole suite in the copy went 1947 → 1956 tests with the same 41 files failing before and after (they import packages; the copy has no `node_modules`), `tsc` (the repo's TypeScript 5.9.3 with the repo's `@types`, `<tools>/cf/tsconfig.cf.json`) and the repo's eslint config were clean on every changed file and what it imports, and every file kept its line endings.

### Inventory (CF at `388d4d5`)

| Item | Sites at `388d4d5` (file:line) | Decision | Why |
|---|---|---|---|
| 1. Asset state help trigger | the trigger: `c/assets/asset-state-help-popover.tsx:24-41` (a 24px raw `<button>`, `h-6 w-6`) | **fix in this plan** (CF-1) | the user, 2026-10-17: a 44px target on phones, the 24px look kept |
| | callers: `c/assets/asset-form.tsx:1040`, `:1064` (`Field labelAction`); `c/assets/asset-register-filter-sheet.tsx:141`, `:153` (`FilterSelect labelAction`); `D/assets/[id]/page.tsx:904`, `:908` (header meta, beside the state badges); `c/assets/asset-register-table.tsx:771` (`HeaderWithHelp`, used at `:577` and `:582` in the desktop-only table, `getDesktopTableOnlyClasses()` at `:536`) | no change | the fix lives in the trigger; the table head is `md`+ only, where the hit area is off |
| | the raw `<button>` itself | stays (1) | the circle inside a field label row or a table head (plan 2D-3 R5); the new raw-button guard's row for this file keeps its count 1 |
| 2. StatStrip foot | `c/ui/stat-strip.tsx:15` (comment "One line, cut with an ellipsis"), `:56-61` (the foot `<dd>`, `truncate` span, `items-center` icon) | **fix in this plan** (CF-2) | the user, 2026-10-16/17: up to two lines, then the ellipsis (the 2D-4 dev-app check found the rounds list's foot cut at 375) |
| | 36 files render `<StatStrip`; 19 of them set a `foot` | no change | the shared part carries it |
| | `DESIGN.md:443`, `.impeccable/design.json:457` ("an optional faint foot line") | docs area | Tasks 28 and 30 name the two-line foot (D16, J9, J10) |
| 3a. `DashboardPageSkeleton` | `c/ui/page-skeleton.tsx:135-168` (a 5-cell strip, a box of four 96px cards, two boxes of 3 and 5 rows) against `D/dashboard/page.tsx:322-414` (totals 4 + 3, three `ContentPanel`s of numbers, status beside activity) | **fix in this plan** (CF-3) | DH 2D-2 R14; DESIGN.md:629 "a plan that reshapes a page reshapes its skeleton" |
| 3b. Labels passed and never read | `D/admin/settings/page.tsx:110` `generalSettings`, `:194` `selectCategory`, `:201` `accountingDepreciationPolicy`, `:303` `ldapSyncSchedulePreset`; their type lines `c/admin/system-settings-form.tsx:164`, `:248`, `:255`, `:357`; nothing reads `labels.<name>` (`:569` is a local `generalSettings` array, not the label) | **delete** with their four keys (CF-4) | DH 2D-2 R14; no other file binds `systemSettingsPage` |
| 3c. English on the Thai settings screens | `c/admin/system-settings-form.tsx:802` (`…d / …d`), `:807` (`SLA …d`), `:817` (`…d`), `:833` (the overview badge shows the raw mode code, `เปิดใช้งาน (preview)`), `:1806-1808` (`Preview` / `Manual` / `Scheduled`); `c/admin/depreciation-policy-builder.tsx:326` (`… months`) | **fix in this plan** (CF-5), five new keys | DH 2D-2 R14 (the `:833` code was not in that list; it is the same defect on the same screen) |
| | `:807` "SLA"; `:1129` `/q/a/{assetId}` (a URL path); `:1369` `"COM"` (a sample prefix); `:2596` `x` and `mm` (label size); the `value`/`labelKey` codes | stay | a technical term the Thai labels use too (`workflowApprovalSlaDays` "SLA งานรออนุมัติ (วัน)", glossary §2.3), a URL, a code, units |
| 4. Integration list loading line | `messages/th.json` `integrationApiPage.loading` "กำลังโหลด clients", read at `c/admin/IntegrationClientManager.tsx:506` (sr-only, in the list head's `role="status"`) | **fix in this plan** (CF-6), th only | DH 2D-2 Handed on; en "Loading clients" is sensible |
| | `integrationApiPage.loadFailed` "โหลด API clients ไม่สำเร็จ" | **fix in this plan** (CF-6) | the same mix; the user, 2026-10-17 (open issue CF-b) |
| 5. Option select live line | `c/maintenance/maintenance-option-select.tsx:95`: `"Loading"` (a fallback no caller reaches: all 7 callers pass `loadingLabel={tCommon("loading")}`) and `` `${displayOptions.length} results` `` (always English) | **fix in this plan** (CF-7), one new key | plan 2D-4 R18, open issue 10 c |
| | `:53` `throw new Error("Unable to load maintenance options")` | stays | caught at `:56-57`, never shown |
| 6. `/api` links (all 26 `<a>` in `src`, by `<tools>/api-links.mjs`) | report header exports `D/reports/page.tsx:199`, `:205` (no `download`) | **fix in this plan** (CF-8) | M31 pattern; the report cards beside them have it (2D-2 dev-app check) |
| | with `download` already: `D/admin/roles/page.tsx:100`, `D/master-data/brands/page.tsx:215`, `:219`, `D/master-data/categories/page.tsx:141`, `:145`, `c/reports/reports-catalog-view.tsx:168`, `c/reports/reports-operations-view.tsx:156` | no change | M31 (2D-1, 2D-2) |
| | other exports without `download`: `D/audit/findings/page.tsx:308`, `:312`, `D/audit/rounds/[id]/page.tsx:462`, `:466`, `:470`, `D/disposal/page.tsx:335`, `D/maintenance/page.tsx:241`, `c/assets/asset-register-export-menu.tsx:21`, `:27` | **fix in this plan** (CF-8) | the user, 2026-10-17 (open issue CF-c); the attachment links stay (CF-R8) |
| | attachment files (open or preview): `D/assets/[id]/page.tsx:2266`, `D/audit/findings/page.tsx:642`, `:669`, `c/assets/asset-attachments.tsx:204`, `:399`, `c/assets/asset-form.tsx:1306`, `c/assets/asset-purchase-documents.tsx:132`, `c/disposal/disposal-attachments.tsx:117`, `c/maintenance/maintenance-attachments.tsx:191`, `c/ui/attachment-preview-dialog.tsx:56` | no change | a file to open, not an export |
| 7. Message keys no code reads | 4137 keys in `messages/th.json`; 76 reached by nothing in `src` (list in CF-9) | **delete** (CF-9) | spec §4.1 / D12 spirit; the namespace-aware finder and a hand check of every leaf collision (CF-R9) |
| | the repo's own literal-only `scripts/find-unused-messages.mjs` lists 192: four of the 76 (`common.of`, `asset.purchaseDocumentAmount`, `asset.latestAudit`, `auditFinding.comparison`) and 188 more, 184 `systemLogPage.*` (read whole through `getMessages()`, `D/admin/logs/page.tsx:45-46`, `D/admin/approvals/history/page.tsx:56-57`) and 4 `notifications.*Detail` (`` t(`${item.key}Detail`) ``, `D/notifications/page.tsx:88`, `c/layout/topbar.tsx:207`) | stay | built at run time (DH 2026-10-08 "namespaces built at runtime stay whole") |

No phase 3 row, no `EXEMPT` row and no `OWNERS` row comes from this area. Not in this area: the guard files (Tasks 10–27) and the docs pass (Tasks 28–30, 32).

---

### Task 1 (CF-1): The asset state help trigger gets a 44px target on phones and keeps its 24px look (`src/components/assets/asset-state-help-popover.tsx`)

The user, 2026-10-17; plan 2D-3 R5 (the raw button stays). Below `md` the trigger's `::after` box becomes the touch target, 44 × 44px around the 24px circle: 10px to each side, 16px up and 4px down (CF-R1). From `md`, where the trigger sits in mouse-sized label rows and the desktop table head, the box is off and nothing changes. The circle, its hover and focus ring, the popover, its open logic and every caller stay.

**Files:**
- Modify: `src/components/assets/asset-state-help-popover.tsx` (CRLF)
- Create: `tests/phase2d-final-ui.test.ts` (LF, new; CF-2 – CF-9 append to it)

**Interfaces:** the test file's header defines `read(path)` (LF), `C` and `D`; the later CF blocks use them. `messages(locale)` comes from Task 4 (CF-4), whose test is its first caller (dry run: a header const unused until Task 4 is an eslint `no-unused-vars` warning in `tests/`).

**Changes at 388d4d5:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| before `:23` | — | a three-line JSX comment above `<PopoverTrigger asChild>`: `{/* A 24px circle beside a field label, in the page header or in a table head. Below md its ::after box makes the` / `target 44px (the user, 2026-10-17): 10px to each side, 16px up and 4px down, where the field's own control` / `starts. From md, where the pointer is a mouse, it stays 24px. */}` (three lines, indented as the JSX around them; no class name of the test's `doesNotMatch` in it) | CF-R1 |
| `:38` | `className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"` | the same string with ` relative after:absolute after:-inset-x-2.5 after:-top-4 after:-bottom-1 md:after:hidden` appended at its end (the pin `tests/asset-status-help-ui.test.ts:24` reads its start) | CF-R1 |

- [ ] **Step 1: The failing test.** Create `tests/phase2d-final-ui.test.ts` (LF) with exactly:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-5 (spec 2D §1, §3.5): the fixes handed to the last plan of 2D, one test per commit, each failing before its
// commit: the asset state help's phone target, two-line StatStrip feet, the dashboard skeleton, the settings labels no
// one read, words instead of English codes on the settings screens, Thai loading and result lines, export links that
// download and the message keys no code reads. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"
const D = "src/app/[locale]/(dashboard)/"

test("the asset state help trigger stays a 24px circle and gets a 44px hit area below md (the user, 2026-10-17)", () => {
  const source = read(`${C}assets/asset-state-help-popover.tsx`)
  const trigger = source.match(/<button\b[\s\S]*?className="([^"]+)"/)?.[1].split(/\s+/) ?? []
  // Below md: 10 + 24 + 10 = 44px wide and 16 + 24 + 4 = 44px tall. The box stops 4px under the circle, where the
  // field's own control starts (a 20px label row, the circle's -2px margins, the field's 6px gap). From md it is off.
  for (const token of ["inline-flex", "h-6", "w-6", "rounded-full", "relative", "after:absolute", "after:-inset-x-2.5", "after:-top-4", "after:-bottom-1", "md:after:hidden"]) {
    assert.ok(trigger.includes(token), `trigger class ${token}`)
  }
  assert.doesNotMatch(source, /\b(?:min-h-11|min-w-11|size-11|h-11|w-11)\b|-m-2\.5|-mx-2\.5|-my-2\.5/, "the circle itself does not grow or shift")
  assert.equal(source.match(/<button\b/g)?.length, 1, "still one raw button (plan 2D-3 R5)")
  // Every caller stays as it is: two field labels each in the asset form and the register filter sheet, the asset page
  // header and the register table head (shown from md only, where the hit area is off).
  const callers: Array<[string, number]> = [
    [`${C}assets/asset-form.tsx`, 2],
    [`${C}assets/asset-register-filter-sheet.tsx`, 2],
    [`${D}assets/[id]/page.tsx`, 2],
    [`${C}assets/asset-register-table.tsx`, 1],
  ]
  for (const [path, count] of callers) assert.equal(read(path).match(/<AssetStateHelpPopover \{\.\.\.\w+\} \/>/g)?.length, count, path)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/phase2d-final-ui.test.ts`. Expected to fail: "the asset state help trigger stays a 24px circle and gets a 44px hit area below md (the user, 2026-10-17)" (`trigger class relative`).
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard edits:** none. The file keeps one raw `<button>` (the raw-button guard's row for it stays 1) and gains no raw color, dashed border, `disabled:opacity-*` or `sm:` height.
- [ ] **Step 5: Verify.** `node --test tests/phase2d-final-ui.test.ts tests/asset-status-help-ui.test.ts tests/asset-forms-ui.test.ts tests/asset-register-filter-ui.test.ts tests/visual-foundation-guards.test.ts`; `npm test` (+1: 2160 tests, 2159 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`; `npx eslint tests/phase2d-final-ui.test.ts` is clean). `node <tools>/eol.mjs src/components/assets/asset-state-help-popover.tsx tests/phase2d-final-ui.test.ts` prints `66 66` and `0 32` (63 lines at `388d4d5` plus the three-line comment; the test file without the `messages` line).
- [ ] **Step 6: Commit.** `git add src/components/assets/asset-state-help-popover.tsx tests/phase2d-final-ui.test.ts` (the LF warning of the new test file is expected), then `git commit -m "fix(ui): the asset state help gets a 44px target below md and keeps its 24px circle (2D-5 task 1, CF-1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 2 (CF-2): StatStrip feet wrap to two lines before the ellipsis (`src/components/ui/stat-strip.tsx`)

The user, 2026-10-16/17 (the 2D-4 dev-app check measured the rounds list's "งานที่ต้องทำต่อ" foot cut at 375). A foot line wraps to at most two lines (`line-clamp-2`, with `break-words` for a long code), then ends with the ellipsis; `footTitle` still holds the full text. The warning icon of an `attention` foot sits in a 20px box, the height of the 13/20 line, so it stays on the first line when the foot wraps; a one-line foot looks as before (CF-R2). The cell's subgrid of three rows (label, value, foot) stays, so a two-line foot lowers only the row of feet in that strip row. Labels, values, links, `current` and every caller stay.

**Files:**
- Modify: `src/components/ui/stat-strip.tsx` (CRLF)
- Test: `tests/phase2d-final-ui.test.ts` (LF); pins: `tests/list-primitives-ui.test.ts` (CRLF)

**Changes at 388d4d5:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:15` | `  // One line, cut with an ellipsis; footTitle is its title for the cut text.` | `  // Up to two lines, then cut with an ellipsis; footTitle is its title for the cut text.` | CF-R2 |
| `:57` | `<dd className={cn("flex min-w-0 items-center gap-1 text-meta", item.attention ? "text-warning" : "text-faint-foreground")}>` | `items-center` → `items-start` | CF-R2 |
| `:58` | `{item.attention ? <AttentionIcon className="size-3.5 shrink-0" aria-hidden="true" /> : null}` | a JSX comment line `{/* The icon's 20px box is the first line's height, so it stays on that line when the foot wraps. */}`, then `{item.attention ? (` `<span className="flex h-5 shrink-0 items-center">` `<AttentionIcon className="size-3.5" aria-hidden="true" />` `</span>` `) : null}` (one element per line) | CF-R2 |
| `:59` | `<span className="truncate" title={item.footTitle}>{item.foot}</span>` | `<span className="line-clamp-2 break-words" title={item.footTitle}>{item.foot}</span>` | the user |

- [ ] **Step 1: The failing test.** Append to `tests/phase2d-final-ui.test.ts`:

```ts

test("a StatStrip foot wraps to two lines before its ellipsis, and the label, value and foot rows stay aligned (the user, 2026-10-17)", () => {
  const source = read(`${C}ui/stat-strip.tsx`)
  assert.match(source, /<span className="line-clamp-2 break-words" title=\{item\.footTitle\}>\{item\.foot\}<\/span>/)
  assert.doesNotMatch(source, /className="truncate"/, "no one-line cut")
  // The warning icon sits in a 20px box (the 13/20 line): centred on the first line however many lines follow.
  assert.match(source, /cn\("flex min-w-0 items-start gap-1 text-meta", item\.attention \? "text-warning" : "text-faint-foreground"\)/)
  assert.match(source, /<span className="flex h-5 shrink-0 items-center">\s*<AttentionIcon className="size-3\.5" aria-hidden="true" \/>\s*<\/span>/)
  // Unchanged: the subgrid of three rows per cell, so a two-line foot lowers the whole row of feet, never a value.
  assert.match(source, /const statClasses = "group relative row-span-3 grid grid-rows-subgrid /)
  assert.match(source, /lg:grid-rows-\[repeat\(3,auto\)\]/)
})
```

  Existing pins, `tests/list-primitives-ui.test.ts`:
  - `:264` old: `  assert.match(source, /cn\("flex min-w-0 items-center gap-1 text-meta", item\.attention \? "text-warning" : "text-faint-foreground"\)/)` → new: `  assert.match(source, /cn\("flex min-w-0 items-start gap-1 text-meta", item\.attention \? "text-warning" : "text-faint-foreground"\)/)`
  - `:266` old: `  assert.match(source, /<span className="truncate" title=\{item\.footTitle\}>\{item\.foot\}<\/span>/)` → new: `  assert.match(source, /<span className="line-clamp-2 break-words" title=\{item\.footTitle\}>\{item\.foot\}<\/span>/)`
- [ ] **Step 2: Watch it fail.** `node --test tests/phase2d-final-ui.test.ts tests/list-primitives-ui.test.ts`. Expected to fail: "a StatStrip foot wraps to two lines before its ellipsis, and the label, value and foot rows stay aligned (the user, 2026-10-17)" and "StatStrip is one flat frame of dt/dd cells; a filter cell is primary-soft, never a status fill (2B §3.13)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard edits:** none (`c/ui/stat-strip.tsx` stays in LFG `NAV_PRIMITIVES`; VFG `:65` and `:94` still hold).
- [ ] **Step 5: Verify.** `node --test tests/phase2d-final-ui.test.ts tests/list-primitives-ui.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts`; `npm test` (+1: 2161 / 2160 / 0 / 1); `npx tsc --noEmit`; `npm run lint`. `node <tools>/eol.mjs src/components/ui/stat-strip.tsx tests/list-primitives-ui.test.ts` prints `71 71` and `332 332`.
- [ ] **Step 6: Commit.** `git add src/components/ui/stat-strip.tsx tests/phase2d-final-ui.test.ts tests/list-primitives-ui.test.ts`, then `git commit -m "fix(ui): StatStrip foot lines wrap to two lines before the ellipsis (2D-5 task 2, CF-2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 3 (CF-3): The dashboard skeleton takes the dashboard's shape (`src/components/ui/page-skeleton.tsx`)

DH 2D-2 R14 (open issue 2 of plan 2D-2); DESIGN.md:629. Since plan 2D-2 the dashboard is a title, the seven totals as two `StatStrip`s (4 + 3), three `ContentPanel`s of numbers (the actions with foot lines, the cross-scope counts over their preview list, the four monthly trends with foot lines) and the status overview beside the recent activity from `lg`; its skeleton still drew a five-cell strip and boxes of cards. The skeleton follows the page (CF-R3): `MetricGridSkeleton` gets an optional foot line, and a private `PanelSkeleton` draws the `ContentPanel` frame (`p-4 sm:p-5`, the 16px title, an optional description line, 16px above the body) the way `FilterPanelSkeleton` draws its own. The other four skeletons, `aria-busy`, the pulse and `dashboard/loading.tsx` stay.

**Files:**
- Modify: `src/components/ui/page-skeleton.tsx` (CRLF)
- Test: `tests/phase2d-final-ui.test.ts` (LF)

**Changes at 388d4d5:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:1` | `import type { ComponentProps } from "react"` | `import type { ComponentProps, ReactNode } from "react"` | — |
| `:58` | `function MetricGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {` | a comment line above it, `// foot: the faint foot line under the value (the dashboard's action and trend counts).`, and `function MetricGridSkeleton({ count = 4, foot = false, className }: { count?: number; foot?: boolean; className?: string }) {` | CF-R3 |
| after `:64` | — | `          {foot ? <SkeletonBlock className="h-4 w-32 max-w-full" /> : null}` | CF-R3 |
| before `:125` | — | `PanelSkeleton` (exact text below) with its two comment lines, then a blank line | CF-R3 |
| `:135-168` | `DashboardPageSkeleton` (`<MetricGridSkeleton count={5} />`, a `p-5` box with four `h-24` blocks in `md:grid-cols-4`, a `grid gap-6 lg:grid-cols-2` of two `p-5` boxes) | the exact text below, with its three comment lines above it | CF-R3 |

```tsx
// ContentPanel: the 12px white frame with its p-4 sm:p-5 padding, the 16px title and, when the panel has one, the
// description line, 16px above the body.
function PanelSkeleton({ description = false, children }: { description?: boolean; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <SkeletonBlock className="h-6 w-48 max-w-full" />
      {description ? <SkeletonBlock className="mt-1 h-5 w-80 max-w-full" /> : null}
      <div className="mt-4">{children}</div>
    </div>
  )
}
```

```tsx
// The dashboard (plan 2D-2 R7): the title, the seven totals in strips of 4 + 3, the actions panel (up to six counts
// with their foot lines, 3 + 3), the cross-scope panel (four counts over the preview list), the monthly trends (four
// counts with their foot lines), then the status overview beside the recent activity from lg.
export function DashboardPageSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-6">
      <PageHeaderSkeleton meta="none" actions={false} />
      <div className="space-y-3">
        <MetricGridSkeleton count={4} />
        <MetricGridSkeleton count={3} />
      </div>
      <PanelSkeleton description>
        <div className="space-y-3">
          <MetricGridSkeleton count={3} foot />
          <MetricGridSkeleton count={3} foot />
        </div>
      </PanelSkeleton>
      <PanelSkeleton description>
        <MetricGridSkeleton count={4} />
        <SkeletonBlock className="mt-4 h-24" />
      </PanelSkeleton>
      <PanelSkeleton description>
        <MetricGridSkeleton count={4} foot />
      </PanelSkeleton>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PanelSkeleton>
          <div className="grid gap-1">
            {Array.from({ length: 4 }, (_, index) => (
              <SkeletonBlock key={index} className="h-11 md:h-8" />
            ))}
          </div>
        </PanelSkeleton>
        <PanelSkeleton>
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <SkeletonBlock key={index} className="h-16" />
            ))}
          </div>
        </PanelSkeleton>
      </div>
    </div>
  )
}
```

- [ ] **Step 1: The failing test.** Append to `tests/phase2d-final-ui.test.ts`:

```ts

test("the dashboard skeleton has the page's shape: totals as 4 + 3, three panels of numbers, then status beside activity (plan 2D-2 R14)", () => {
  const source = read(`${C}ui/page-skeleton.tsx`)
  const dashboard = source.slice(source.indexOf("export function DashboardPageSkeleton()"), source.indexOf("export function AssetRegisterPageSkeleton()"))
  // In page order: the seven totals (4 + 3), the action counts with their foot lines (3 + 3), the four cross-scope
  // counts over their preview, the four monthly trends with their foot lines.
  const strips = [...dashboard.matchAll(/<MetricGridSkeleton count=\{(\d+)\}( foot)? \/>/g)].map((match) => `${match[1]}${match[2] ?? ""}`)
  assert.deepEqual(strips, ["4", "3", "3 foot", "3 foot", "4", "4 foot"])
  assert.equal(dashboard.match(/<PanelSkeleton description>/g)?.length, 3, "the action, cross-scope and trend panels have a description")
  assert.equal(dashboard.match(/<PanelSkeleton>/g)?.length, 2, "the status overview and the recent activity")
  assert.match(dashboard, /<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">/, "status beside activity from lg, as on the page")
  assert.match(source, /function PanelSkeleton\(\{ description = false, children \}: \{ description\?: boolean; children: ReactNode \}\)/)
  assert.match(source, /<div className="rounded-lg border border-border bg-surface p-4 sm:p-5">\s*<SkeletonBlock className="h-6 w-48 max-w-full" \/>/, "a ContentPanel frame and its title")
  assert.match(source, /\{foot \? <SkeletonBlock className="h-4 w-32 max-w-full" \/> : null\}/, "a StatStrip foot line")
  assert.doesNotMatch(dashboard, /count=\{5\}|md:grid-cols-4|p-5"/, "the old five-tile grid and its box of four cards are gone")
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/phase2d-final-ui.test.ts tests/page-loading-skeleton.test.ts`. Expected to fail: "the dashboard skeleton has the page's shape: totals as 4 + 3, three panels of numbers, then status beside activity (plan 2D-2 R14)". `tests/page-loading-skeleton.test.ts` passes before and after (its five `aria-busy` frames, the `MetricGridSkeleton` frame and cell classes and the title-only dashboard header are unchanged).
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard edits:** none.
- [ ] **Step 5: Verify.** `node --test tests/phase2d-final-ui.test.ts tests/page-loading-skeleton.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`; `npm test` (+1: 2162 / 2161 / 0 / 1); `npx tsc --noEmit`; `npm run lint`. `node <tools>/eol.mjs src/components/ui/page-skeleton.tsx` prints `257 257`.
- [ ] **Step 6: Commit.** `git add src/components/ui/page-skeleton.tsx tests/phase2d-final-ui.test.ts`, then `git commit -m "fix(ui): the dashboard skeleton shows the totals as 4 + 3 and the page's three number panels (2D-5 task 3, CF-3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 4 (CF-4): The settings page stops passing four labels its form never reads (`src/app/[locale]/(dashboard)/admin/settings/page.tsx`, `src/components/admin/system-settings-form.tsx`)

DH 2D-2 R14 (open issue 3 of plan 2D-2). The page passes `generalSettings`, `selectCategory`, `accountingDepreciationPolicy` and `ldapSyncSchedulePreset`; the form declares them in its labels type and never reads them (grep of `src` and `tests`: no `labels.<name>`; `:569` `const generalSettings` is the advanced settings array, not the label; `systemSettingsPage` is bound in these two files only). The four pass lines, the four type lines and the four keys go (CF-R4). Their neighbours stay: `accountingDepreciationPolicyDescription` (read at `:1483`), `ldapSyncSchedule`, the advanced settings list.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/admin/settings/page.tsx` (CRLF), `src/components/admin/system-settings-form.tsx` (CRLF), `messages/th.json` and `messages/en.json` (CRLF, through `scripts/messages-edit.mjs`)
- Test: `tests/phase2d-final-ui.test.ts` (LF)

**Changes at 388d4d5:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| page `:110` | `          generalSettings: t("generalSettings"),` | deleted | CF-R4 |
| page `:194` | `          selectCategory: t("selectCategory"),` | deleted | CF-R4 |
| page `:201` | `          accountingDepreciationPolicy: t("accountingDepreciationPolicy"),` | deleted (`:202`, its description, stays) | CF-R4 |
| page `:303` | `          ldapSyncSchedulePreset: t("ldapSyncSchedulePreset"),` | deleted | CF-R4 |
| form `:164`, `:248`, `:255`, `:357` | `    generalSettings: string` · `    selectCategory: string` · `    accountingDepreciationPolicy: string` · `    ldapSyncSchedulePreset: string` | deleted | CF-R4 |
| messages | `systemSettingsPage.generalSettings`, `.selectCategory`, `.accountingDepreciationPolicy`, `.ldapSyncSchedulePreset` | deleted in th and en (change file `<temp>/cf-4-messages.json`, "Message keys") | CF-R4 |

- [ ] **Step 1: The failing test.** Append to `tests/phase2d-final-ui.test.ts` (the block starts with the `messages` helper, whose first caller this test is; a module-level const placed before the first test that uses it is safe):

```ts

const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))

test("the settings page passes only labels its form reads: the four it never read and their messages are gone (plan 2D-2 R14)", () => {
  const page = read(`${D}admin/settings/page.tsx`)
  const form = read(`${C}admin/system-settings-form.tsx`)
  for (const name of ["generalSettings", "selectCategory", "accountingDepreciationPolicy", "ldapSyncSchedulePreset"]) {
    assert.doesNotMatch(page, new RegExp(`\\b${name}: t\\("${name}"\\)`), `page passes ${name}`)
    assert.doesNotMatch(form, new RegExp(`\\n\\s+${name}: string\\n`), `form labels type has ${name}`)
    assert.doesNotMatch(form, new RegExp(`labels\\.${name}\\b`), `form reads labels.${name}`)
    for (const locale of ["th", "en"] as const) assert.equal(messages(locale).systemSettingsPage[name], undefined, `${locale}: systemSettingsPage.${name}`)
  }
  // Their neighbours stay: the description the form does read, the schedule label and the advanced settings list.
  assert.match(page, /accountingDepreciationPolicyDescription: t\("accountingDepreciationPolicyDescription"\)/)
  assert.match(form, /\{labels\.accountingDepreciationPolicyDescription\}/)
  assert.match(page, /ldapSyncSchedule: t\("ldapSyncSchedule"\)/)
  assert.match(form, /const generalSettings = settings\.filter\(/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/phase2d-final-ui.test.ts`. Expected to fail: "the settings page passes only labels its form reads: the four it never read and their messages are gone (plan 2D-2 R14)" (`page passes generalSettings`).
- [ ] **Step 3: Implement** per the Changes table, then save the CF-4 change file of "Message keys" as `<temp>/cf-4-messages.json` and run `node scripts/messages-edit.mjs <temp>/cf-4-messages.json` (prints `messages updated: 0 th, 0 en, 4 deleted`).
- [ ] **Step 4: Guard edits:** none (FMG lists both files in `1f`; no field, `Loader2` or constraint count changes).
- [ ] **Step 5: Verify.** `node --test tests/phase2d-final-ui.test.ts tests/admin-sweep-ui.test.ts tests/settings-depreciation-policy-ui.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts tests/form-migration-guards.test.ts`; `npm test` (+1: 2163 / 2162 / 0 / 1); `npx tsc --noEmit`; `npm run lint`. Both code files keep CRLF (each number printed twice by `eol.mjs`).
- [ ] **Step 6: Commit.** `git add "src/app/[locale]/(dashboard)/admin/settings/page.tsx" src/components/admin/system-settings-form.tsx messages/th.json messages/en.json tests/phase2d-final-ui.test.ts`, then `git commit -m "refactor(admin): drop the four settings labels the form never read, and their messages (2D-5 task 4, CF-4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 5 (CF-5): The settings screens name the LDAP sync modes, the legacy rules' months and the overview's days in words (`src/components/admin/system-settings-form.tsx`, `src/components/admin/depreciation-policy-builder.tsx`, `src/app/[locale]/(dashboard)/admin/settings/page.tsx`)

DH 2D-2 R14 (open issue 4 of plan 2D-2): English literals on the Thai settings screens. The LDAP sync mode options read "Preview / Manual / Scheduled", the overview's LDAP sync badge shows the raw mode code ("เปิดใช้งาน (preview)"), the overview's notification, approval SLA and retention values end in an English "d", and the depreciation builder lists legacy rules as "<match>: <n> months". Five new `systemSettingsPage` keys carry the words (glossary: ซิงก์, ตัวอย่าง); the page passes them as labels the way it passes `advancedSettingCount` (a template with `{count}` that the form fills with `.replace`), so the form and the builder stay label-driven (CF-R5). "SLA", the mode codes stored in the database, the day numbers (shown as typed) and the option values stay.

**Files:**
- Modify: `src/components/admin/system-settings-form.tsx` (CRLF), `src/components/admin/depreciation-policy-builder.tsx` (CRLF), `src/app/[locale]/(dashboard)/admin/settings/page.tsx` (CRLF), `messages/th.json` and `messages/en.json` (CRLF, through `scripts/messages-edit.mjs`)
- Test: `tests/phase2d-final-ui.test.ts` (LF)

**Interfaces** (inside this task only): the form's labels type and the builder's `DepreciationPolicyBuilderLabels` gain `depreciationLegacyRuleMonths: string`; the form's labels type gains `overviewDays`, `ldapSyncModePreview`, `ldapSyncModeManual`, `ldapSyncModeScheduled` (all `string`). The form passes its whole `labels` to the builder as before.

**Changes at 388d4d5** (CF-4 deleted four lines in each of the page and the form, so the page's sites below `:110` sit up to 3 lines higher and the form's below `:164` up to 4; find the sites by their quoted text):

| Line | Now | Becomes | Rule |
|---|---|---|---|
| page after `:93` | `          overviewAdvanced: t("overviewAdvanced"),` | add `          overviewDays: t("overviewDays", { count: "{count}" }),` | CF-R5 |
| page after `:228` | `          depreciationLegacyRulesHelp: t("depreciationLegacyRulesHelp"),` | add `          depreciationLegacyRuleMonths: t("depreciationLegacyRuleMonths", { months: "{months}" }),` | CF-R5 |
| page after `:301` | `          ldapSyncMode: t("ldapSyncMode"),` | add three lines: `ldapSyncModePreview: t("ldapSyncModePreview"),`, `ldapSyncModeManual: t("ldapSyncModeManual"),`, `ldapSyncModeScheduled: t("ldapSyncModeScheduled"),` (same indent) | CF-R5 |
| form after `:147`, `:282`, `:355` | `    overviewAdvanced: string` · `    depreciationLegacyRulesHelp: string` · `    ldapSyncMode: string` | add `    overviewDays: string` · `    depreciationLegacyRuleMonths: string` · `    ldapSyncModePreview: string`, `    ldapSyncModeManual: string`, `    ldapSyncModeScheduled: string` | CF-R5 |
| form after `:784` | `  const ldapSyncEnabled = getValue("ldap_sync_enabled") === "true"` | add the exact block below (two comment lines, `formatDays`, `ldapSyncModeLabels`, `ldapSyncMode`) | CF-R5 |
| form `:802` | ``      value: `${getValue(notificationReturnDueSoonDaysKey) \|\| "3"}d / ${getValue(notificationWarrantyExpiryDaysKey) \|\| "30"}d`,`` | ``      value: `${formatDays(getValue(notificationReturnDueSoonDaysKey) \|\| "3")} / ${formatDays(getValue(notificationWarrantyExpiryDaysKey) \|\| "30")}`,`` | CF-R5 |
| form `:807` | `SLA ${workflowApprovalPolicy.slaDays}d / ` (inside the template) | `SLA ${formatDays(workflowApprovalPolicy.slaDays)} / ` | CF-R5 |
| form `:817` | ``{getValue(key) ? `${getValue(key)}d` : <Nil />}`` | `{getValue(key) ? formatDays(getValue(key)) : <Nil />}` | CF-R5 |
| form `:833` | ``label={ldapSyncEnabled ? `${labels.enabled} (${getValue("ldap_sync_mode") \|\| "preview"})` : labels.disabled}`` | ``label={ldapSyncEnabled ? `${labels.enabled} (${ldapSyncModeLabels[ldapSyncMode] ?? ldapSyncMode})` : labels.disabled}`` | CF-R5 |
| form `:1806-1808` | `<option value="preview">Preview</option>` · `<option value="manual">Manual</option>` · `<option value="scheduled">Scheduled</option>` | `<option value="preview">{labels.ldapSyncModePreview}</option>` · `<option value="manual">{labels.ldapSyncModeManual}</option>` · `<option value="scheduled">{labels.ldapSyncModeScheduled}</option>` | CF-R5 |
| builder after `:55` | `  depreciationLegacyRulesHelp: string` | add `  depreciationLegacyRuleMonths: string` | CF-R5 |
| builder `:326` | `<li key={…}>{rule.match}: {rule.usefulLifeMonths} months</li>` | `<li key={…}>{rule.match}: {labels.depreciationLegacyRuleMonths.replace("{months}", formatCount(rule.usefulLifeMonths))}</li>` (the `key` stays; `formatCount` is imported at `:29`) | CF-R5 |
| messages | — | five keys added in th and en (change file `<temp>/cf-5-messages.json`, "Message keys") | CF-R5 |

```ts
  // Day counts and the saved sync mode in words, never an English "d" or a mode code (plan 2D-2 R14). A mode the
  // labels do not know shows as it is (docs/19_THAI_GLOSSARY.md).
  const formatDays = (days: string | number) => labels.overviewDays.replace("{count}", String(days))
  const ldapSyncModeLabels: Record<string, string> = {
    preview: labels.ldapSyncModePreview,
    manual: labels.ldapSyncModeManual,
    scheduled: labels.ldapSyncModeScheduled,
  }
  const ldapSyncMode = getValue("ldap_sync_mode") || "preview"
```

- [ ] **Step 1: The failing test.** Append to `tests/phase2d-final-ui.test.ts`:

```ts

test("the settings screens name the LDAP sync modes, the legacy rules' months and the overview's day counts in words (plan 2D-2 R14)", () => {
  const form = read(`${C}admin/system-settings-form.tsx`)
  const builder = read(`${C}admin/depreciation-policy-builder.tsx`)
  const page = read(`${D}admin/settings/page.tsx`)
  assert.match(form, /<option value="preview">\{labels\.ldapSyncModePreview\}<\/option>\s*<option value="manual">\{labels\.ldapSyncModeManual\}<\/option>\s*<option value="scheduled">\{labels\.ldapSyncModeScheduled\}<\/option>/)
  // The overview names the saved mode; a code with no words yet shows as it is (docs/19_THAI_GLOSSARY.md).
  assert.match(form, /const ldapSyncMode = getValue\("ldap_sync_mode"\) \|\| "preview"/)
  assert.match(form, /`\$\{labels\.enabled\} \(\$\{ldapSyncModeLabels\[ldapSyncMode\] \?\? ldapSyncMode\}\)`/)
  assert.match(form, /const formatDays = \(days: string \| number\) => labels\.overviewDays\.replace\("\{count\}", String\(days\)\)/)
  assert.equal(form.match(/formatDays\(/g)?.length, 4, "return due soon, warranty, the approval SLA and the retention days")
  assert.doesNotMatch(form, />(?:Preview|Manual|Scheduled)</)
  assert.doesNotMatch(form, /\}d\b/, "no English day suffix")
  assert.match(builder, /\{rule\.match\}: \{labels\.depreciationLegacyRuleMonths\.replace\("\{months\}", formatCount\(rule\.usefulLifeMonths\)\)\}/)
  assert.doesNotMatch(builder, / months</)
  assert.match(page, /overviewDays: t\("overviewDays", \{ count: "\{count\}" \}\)/)
  assert.match(page, /depreciationLegacyRuleMonths: t\("depreciationLegacyRuleMonths", \{ months: "\{months\}" \}\)/)
  const keys = ["overviewDays", "depreciationLegacyRuleMonths", "ldapSyncModePreview", "ldapSyncModeManual", "ldapSyncModeScheduled"]
  for (const key of keys.slice(2)) assert.match(page, new RegExp(`\\b${key}: t\\("${key}"\\)`))
  for (const key of keys) {
    const text = String(messages("th").systemSettingsPage[key]).replace(/\{\w+\}/g, "")
    assert.match(text, /[฀-๿]/, `th ${key} is Thai`)
    assert.doesNotMatch(text, /[A-Za-z]/, `th ${key} has no English`)
    assert.equal(typeof messages("en").systemSettingsPage[key], "string", `en ${key}`)
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/phase2d-final-ui.test.ts`. Expected to fail: "the settings screens name the LDAP sync modes, the legacy rules' months and the overview's day counts in words (plan 2D-2 R14)".
- [ ] **Step 3: Implement** per the Changes table, then save the CF-5 change file as `<temp>/cf-5-messages.json` and run `node scripts/messages-edit.mjs <temp>/cf-5-messages.json` (prints `messages updated: 5 th, 5 en, 0 deleted`; the keys land at the end of `systemSettingsPage`).
- [ ] **Step 4: Guard edits:** none.
- [ ] **Step 5: Verify.** `node --test tests/phase2d-final-ui.test.ts tests/admin-sweep-ui.test.ts tests/settings-depreciation-policy-ui.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`; `npm test` (+1: 2164 / 2163 / 0 / 1); `npx tsc --noEmit`; `npm run lint`. The three code files keep CRLF.
- [ ] **Step 6: Commit.** `git add src/components/admin/system-settings-form.tsx src/components/admin/depreciation-policy-builder.tsx "src/app/[locale]/(dashboard)/admin/settings/page.tsx" messages/th.json messages/en.json tests/phase2d-final-ui.test.ts`, then `git commit -m "fix(admin): the settings screens name the LDAP sync modes, legacy rule months and day counts in Thai (2D-5 task 5, CF-5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 6 (CF-6): The integration client list's loading and error lines are Thai (`messages/th.json`)

DH 2D-2 "Handed on" and its dev-app check: the screen reader hears "กำลังโหลด clients" while the client list loads (`c/admin/IntegrationClientManager.tsx:506`, the sr-only text in the list head's `role="status"`; the visible spinner beside it). The th value becomes "กำลังโหลดรายการ": Thai only, and the panel title it sits beside ("Client ที่ลงทะเบียน") names the list (CF-R6). en "Loading clients" stays. No code changes.

**Files:**
- Modify: `messages/th.json` (CRLF, through `scripts/messages-edit.mjs`; `messages/en.json` is rewritten unchanged, so git shows no change in it)
- Test: `tests/phase2d-final-ui.test.ts` (LF)

**Changes at 388d4d5:**

| Key | Now (th) | Becomes (th) | Rule |
|---|---|---|---|
| `integrationApiPage.loading` | `กำลังโหลด clients` | `กำลังโหลดรายการ` (change file `<temp>/cf-6-messages.json`) | CF-R6 |

- [ ] **Step 1: The failing test.** Append to `tests/phase2d-final-ui.test.ts`:

```ts

test("the integration client list's screen-reader loading line is Thai on the Thai page (plan 2D-2 hand-on)", () => {
  assert.equal(messages("th").integrationApiPage.loading, "กำลังโหลดรายการ")
  assert.equal(messages("en").integrationApiPage.loading, "Loading clients")
  // The line itself is unchanged: a status beside the list title while the clients load.
  assert.match(read(`${C}admin/IntegrationClientManager.tsx`), /<span role="status" className="inline-flex">\s*<Loader2 [^>]*\/>\s*<span className="sr-only">\{labels\.loading\}<\/span>/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/phase2d-final-ui.test.ts`. Expected to fail: "the integration client list's screen-reader loading line is Thai on the Thai page (plan 2D-2 hand-on)".
- [ ] **Step 3: Implement:** save the CF-6 change file as `<temp>/cf-6-messages.json` and run `node scripts/messages-edit.mjs <temp>/cf-6-messages.json` (prints `messages updated: 2 th, 0 en, 0 deleted` with Step 3b's line).
- [ ] **Step 3b (the user approved open issue CF-b, 2026-10-17):** add `"integrationApiPage.loadFailed": "โหลดรายการไม่สำเร็จ"` to the th `set` of `<temp>/cf-6-messages.json` before running it (en "Could not load API clients" stays; `messages-edit` then prints `2 th`), and add `  assert.equal(messages("th").integrationApiPage.loadFailed, "โหลดรายการไม่สำเร็จ")` as the test's last line, in the same commit.
- [ ] **Step 4: Guard edits:** none (FMG `LOADER2` of `IntegrationClientManager.tsx` stays 1: the file does not change).
- [ ] **Step 5: Verify.** `node --test tests/phase2d-final-ui.test.ts tests/integration-api-client-admin.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts`; `npm test` (+1: 2165 / 2164 / 0 / 1); `npx tsc --noEmit`; `npm run lint`; `git status --short messages` lists only `messages/th.json`.
- [ ] **Step 6: Commit.** `git add messages/th.json tests/phase2d-final-ui.test.ts`, then `git commit -m "fix(admin): the integration client list announces its loading and its load error in Thai (2D-5 task 6, CF-6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 7 (CF-7): The maintenance option select announces loading and its result count in the page's language (`src/components/maintenance/maintenance-option-select.tsx`)

Plan 2D-4 R18 and open issue 10 c. The sr-only `aria-live` line under the select reads "N results" in English after every search, and "Loading" if a caller passes no `loadingLabel` (none of the seven does). The component, already a client component, reads `common` itself: `loadingLabel ?? tCommon("loading")` and the new `common.searchSelectResultCount` (th "พบ {count} รายการ", en with an ICU plural), next to `searchSelectPlaceholder` and `searchSelectNoResults` (CF-R7). The `loadingLabel` prop, the callers, the debounce, the fetch and the caught error text stay.

**Files:**
- Modify: `src/components/maintenance/maintenance-option-select.tsx` (CRLF), `messages/th.json` and `messages/en.json` (CRLF, through `scripts/messages-edit.mjs`)
- Test: `tests/phase2d-final-ui.test.ts` (LF)

**Changes at 388d4d5:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| after `:3` | `import { useEffect, useMemo, useState } from "react"` | add `import { useTranslations } from "next-intl"` | CF-R7 |
| before `:38` | `  const [query, setQuery] = useState("")` | add above it `  // The live line under the select reads in the page's language (plan 2D-4 open issue 10 c).` and `  const tCommon = useTranslations("common")` | CF-R7 |
| `:95` | ``        {loading ? loadingLabel ?? "Loading" : `${displayOptions.length} results`}`` | `        {loading ? loadingLabel ?? tCommon("loading") : tCommon("searchSelectResultCount", { count: displayOptions.length })}` | CF-R7 |
| messages | — | `common.searchSelectResultCount` added (change file `<temp>/cf-7-messages.json`) | CF-R7 |

- [ ] **Step 1: The failing test.** Append to `tests/phase2d-final-ui.test.ts`:

```ts

test("the maintenance option select announces loading and its result count from messages, never in English (plan 2D-4 open issue 10 c)", () => {
  const source = read(`${C}maintenance/maintenance-option-select.tsx`)
  assert.match(source, /import \{ useTranslations \} from "next-intl"/)
  assert.match(source, /const tCommon = useTranslations\("common"\)/)
  assert.match(source, /<span className="sr-only" aria-live="polite">\s*\{loading \? loadingLabel \?\? tCommon\("loading"\) : tCommon\("searchSelectResultCount", \{ count: displayOptions\.length \}\)\}\s*<\/span>/)
  assert.doesNotMatch(source, /"Loading"|results`/)
  assert.equal(messages("th").common.searchSelectResultCount, "พบ {count} รายการ")
  assert.equal(messages("en").common.searchSelectResultCount, "{count, plural, one {# result} other {# results}}")
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/phase2d-final-ui.test.ts`. Expected to fail: "the maintenance option select announces loading and its result count from messages, never in English (plan 2D-4 open issue 10 c)".
- [ ] **Step 3: Implement** per the Changes table, then save the CF-7 change file as `<temp>/cf-7-messages.json` and run `node scripts/messages-edit.mjs <temp>/cf-7-messages.json` (prints `messages updated: 1 th, 1 en, 0 deleted`).
- [ ] **Step 4: Guard edits:** none.
- [ ] **Step 5: Verify.** `node --test tests/phase2d-final-ui.test.ts tests/maintenance-option-select.test.ts tests/maintenance-sweep-ui.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts tests/form-migration-guards.test.ts`; `npm test` (+1: 2166 / 2165 / 0 / 1); `npx tsc --noEmit`; `npm run lint`. `eol.mjs` on the component prints `102 102`.
- [ ] **Step 6: Commit.** `git add src/components/maintenance/maintenance-option-select.tsx messages/th.json messages/en.json tests/phase2d-final-ui.test.ts`, then `git commit -m "fix(maintenance): the option select announces loading and its result count in the page's language (2D-5 task 7, CF-7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 8 (CF-8): Every export link downloads like the report cards' (`D/reports/page.tsx` and five more files)

Spec 2D M31 (an `/api` download is `<a href download>` with `buttonVariants`); the 2D-2 dev-app check: the header's two export links have no `download` while the cards below them do. Both get `download`, and so do the nine other export links (the user's answer to open issue CF-c, 2026-10-17; CF-R8). Their order, variants, sizes, icons, labels and permissions stay; every route behind them answers `Content-Disposition: attachment` (`workbookResponse`, `pdfResponse`), so the file a person gets is the same. The attachment links stay (CF-R8).

**Files:**
- Modify: `src/app/[locale]/(dashboard)/reports/page.tsx`, `src/app/[locale]/(dashboard)/audit/findings/page.tsx`, `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`, `src/app/[locale]/(dashboard)/disposal/page.tsx`, `src/app/[locale]/(dashboard)/maintenance/page.tsx`, `src/components/assets/asset-register-export-menu.tsx` (all CRLF; each change adds ` download` inside one line, so no line number moves)
- Test: `tests/phase2d-final-ui.test.ts` (LF); pins: `tests/reports-adaptive-ui.test.ts` (CRLF)

**Changes at 388d4d5:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:194` | `  // last. Plain links to the export routes, like the other export buttons of 2B: a download, not a page to prefetch.` | two lines: `  // last. Plain <a href download> links to the export routes, like the report cards' (spec 2D M31): a download, not a` / `  // page to prefetch.` | M31 |
| `:199` | `<a href={"/api/assets/export?" + exportQuery} className={buttonVariants({ variant: "outline", size: "md" })}>` | `<a href={"/api/assets/export?" + exportQuery} download className={buttonVariants({ variant: "outline", size: "md" })}>` | M31 |
| `:205` | `<a href={"/api/reports/assets-overview/export?" + exportQuery} className={buttonVariants({ size: "md" })}>` | `<a href={"/api/reports/assets-overview/export?" + exportQuery} download className={buttonVariants({ size: "md" })}>` | M31 |
| `D/audit/findings/page.tsx:308`, `:312` | ``<a href={`/api/audit-findings/export?${exportParams.toString()}`} className=…`` and the `export-pdf` one | `download` after the `href` of each | CF-R8 |
| `D/audit/rounds/[id]/page.tsx:462`, `:466`, `:470` | `<a href={auditRoundExportHref} className=…`, `<a href={auditRoundExportPdfHref} className=…`, ``<a href={`/api/audit-rounds/${round.id}/variance-export`} className=…`` | `download` after the `href` of each | CF-R8 |
| `D/disposal/page.tsx:335` | ``<a href={`/api/disposal-requests/export${query ? `?${query}` : ""}`} className=…`` | `download` after the `href` | CF-R8 |
| `D/maintenance/page.tsx:241` | ``<a href={`/api/maintenance-tickets/export?${listQuery}`} className=…`` | `download` after the `href` | CF-R8 |
| `c/assets/asset-register-export-menu.tsx:21`, `:27` | `<a href={exportHref}>`, `<a href={templateHref}>` | `<a href={exportHref} download>`, `<a href={templateHref} download>` | CF-R8 |

- [ ] **Step 1: The failing test.** Append to `tests/phase2d-final-ui.test.ts`:

```ts

test("every export link is an <a download>, as the report cards' (spec 2D M31)", () => {
  const page = read(`${D}reports/page.tsx`)
  const header = page.slice(page.indexOf("const headerActions"), page.indexOf("let viewContent"))
  assert.match(header, /<a href=\{"\/api\/assets\/export\?" \+ exportQuery\} download className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(header, /<a href=\{"\/api\/reports\/assets-overview\/export\?" \+ exportQuery\} download className=\{buttonVariants\(\{ size: "md" \}\)\}>/)
  assert.doesNotMatch(header, /<Link\b/)
  // The other export screens (open issue CF-c, the user 2026-10-17).
  const findings = read(`${D}audit/findings/page.tsx`)
  assert.match(findings, /<a href=\{`\/api\/audit-findings\/export\?\$\{exportParams\.toString\(\)\}`\} download className=/)
  assert.match(findings, /<a href=\{`\/api\/audit-findings\/export-pdf\?\$\{exportParams\.toString\(\)\}`\} download className=/)
  const round = read(`${D}audit/rounds/[id]/page.tsx`)
  assert.match(round, /<a href=\{auditRoundExportHref\} download className=/)
  assert.match(round, /<a href=\{auditRoundExportPdfHref\} download className=/)
  assert.match(round, /<a href=\{`\/api\/audit-rounds\/\$\{round\.id\}\/variance-export`\} download className=/)
  assert.match(read(`${D}disposal/page.tsx`), /<a href=\{`\/api\/disposal-requests\/export\$\{query \? `\?\$\{query\}` : ""\}`\} download className=/)
  assert.match(read(`${D}maintenance/page.tsx`), /<a href=\{`\/api\/maintenance-tickets\/export\?\$\{listQuery\}`\} download className=/)
  const menu = read(`${C}assets/asset-register-export-menu.tsx`)
  assert.match(menu, /<a href=\{exportHref\} download>/)
  assert.match(menu, /<a href=\{templateHref\} download>/)
})
```

  Existing pins, `tests/reports-adaptive-ui.test.ts` (raw CRLF read, one-line regexes):
  - `:223` old: `  assert.match(page, /<a href=\{"\/api\/assets\/export\?" \+ exportQuery\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)` → new: `  assert.match(page, /<a href=\{"\/api\/assets\/export\?" \+ exportQuery\} download className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)`
  - `:224` old: `  assert.match(page, /<a href=\{"\/api\/reports\/assets-overview\/export\?" \+ exportQuery\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/)` → new: `  assert.match(page, /<a href=\{"\/api\/reports\/assets-overview\/export\?" \+ exportQuery\} download className=\{buttonVariants\(\{ size: "md" \}\)\}>/)`
- [ ] **Step 2: Watch it fail.** `node --test tests/phase2d-final-ui.test.ts tests/reports-adaptive-ui.test.ts`. Expected to fail: "every export link is an <a download>, as the report cards' (spec 2D M31)" and "the reports page frames its views with PageHeader, FilterChipList and StatStrip (spec 2B §4.4.6, I24)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard edits:** none.
- [ ] **Step 5: Verify.** `node --test tests/phase2d-final-ui.test.ts tests/reports-adaptive-ui.test.ts tests/list-pages-ui.test.ts tests/asset-register-table-ui.test.ts tests/audit-round-result-drilldown.test.ts tests/audit-finding-resolution.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts tests/visual-foundation-guards.test.ts`; `npm test` (+1: 2167 / 2166 / 0 / 1); `npx tsc --noEmit`; `npm run lint`. `eol.mjs` prints `815 815` for the reports page, `232 232` for the pin file, and for the other five `755 755`, `930 930`, `537 537`, `343 343`, `35 35` (findings, round, disposal, maintenance, export menu). The dry run applied the nine extra edits on the finished clone (Tasks 1–32): `npm test` 2188 / 2187 / 0 / 1, the test fails with the edits stashed.
- [ ] **Step 6: Commit.** `git add "src/app/[locale]/(dashboard)/reports/page.tsx" "src/app/[locale]/(dashboard)/audit/findings/page.tsx" "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx" "src/app/[locale]/(dashboard)/disposal/page.tsx" "src/app/[locale]/(dashboard)/maintenance/page.tsx" src/components/assets/asset-register-export-menu.tsx tests/reports-adaptive-ui.test.ts tests/phase2d-final-ui.test.ts`, then `git commit -m "fix(ui): every export link is an <a download> like the report cards' (2D-5 task 8, CF-8)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 9 (CF-9): Delete the 76 message keys no code reads (`messages/th.json`, `messages/en.json`)

The last CF task, so the list is taken after CF-4 deleted four keys and CF-5 and CF-7 added six: at `388d4d5` and after CF-1 – CF-8 alike, 76 keys of `messages/th.json` are reached by nothing in `src`. The search (CF-R9, `<tools>/unused-message-keys.mjs`) parses every `src/**/*.{ts,tsx}` with the repo's TypeScript and follows each translator by its namespace: a key counts as read when its full path is a literal anywhere; when its relative path is a literal, a template (`` `status.${s}` ``, `` `${k}Detail` ``) or a `"literal" +` prefix in a file that binds the namespace, in a file the translator is passed into, or (when a bound file calls the translator with a computed key or hands it on) in any file that bound file imports; or when a parent is read whole (`getMessages()`, `t.raw`). Every one of the 76 whose leaf word appears as a literal in a file bound to its namespace was checked by hand: each such literal is a data code (`"open"`, `"completed"`, `"cancel"`, a section id such as `"ownership"`), never a key. The repo's literal-only `scripts/find-unused-messages.mjs` lists four of the 76 and 188 keys built at run time, which stay (Inventory). The pin that kept `auditFinding.comparison` (DH "Audit Counting on Phones": "stays (a test checks it)") turns into a pin that it is gone; the `cameraDevice` / `cameraRear` pins of `tests/audit-scan-search-ui.test.ts:106` are `doesNotMatch` and hold either way. No code changes.

**Files:**
- Modify: `messages/th.json`, `messages/en.json` (CRLF, through `scripts/messages-edit.mjs`)
- Test: `tests/phase2d-final-ui.test.ts` (LF); pin: `tests/audit-finding-resolution.test.ts` (CRLF)

**Changes at 388d4d5:** the 76 keys of the CF-9 change file ("Message keys"), by namespace: `common` 1, `nav` 4, `asset` 10 (six of them `detailSections.*`), `brandModel` 2, `supplier` 1, `auditScan` 12, `auditFinding` 3, `maintenancePage` 41 (the repair-ticket screens replaced by repair records; `queue`, `movementLabels` and `statusConsequences` go whole, as `messages-edit` drops an emptied parent), `disposalPage` 2. After it: 4063 keys, none unread.

- [ ] **Step 1: The failing test.** Append to `tests/phase2d-final-ui.test.ts`:

```ts

// The 76 keys of messages/th.json that no code in src reads at 388d4d5 (plan 2D-5 Task CF-9: a namespace-aware search
// that follows each translator into the files it reaches; every leaf that collides with a data code was checked by hand).
test("message keys that no code reads are gone from both languages; keys built at run time stay (plan 2D-5)", () => {
  const unread = [
    "common.of",
    "nav.auditScan", "nav.auditResult", "nav.pendingAssets", "nav.notification",
    "asset.attachments", "asset.purchaseDocumentAmount", "asset.latestAudit", "asset.detailSections.nav",
    "asset.detailSections.ownership", "asset.detailSections.specs", "asset.detailSections.photos",
    "asset.detailSections.movement", "asset.detailSections.notes", "asset.removedAt",
    "brandModel.fileRequired", "brandModel.viewModels",
    "supplier.totalAmount",
    "auditScan.asset", "auditScan.selectAsset", "auditScan.cameraDevice", "auditScan.cameraDeviceFallback",
    "auditScan.cameraRear", "auditScan.actualLocation", "auditScan.actualCustodian", "auditScan.actualDepartment",
    "auditScan.actualCondition", "auditScan.wrongLocation", "auditScan.wrongCustodian", "auditScan.wrongCondition",
    "auditFinding.expectedValue", "auditFinding.actualValue", "auditFinding.comparison",
    "maintenancePage.subtitle", "maintenancePage.createTitle", "maintenancePage.createSubtitle",
    "maintenancePage.createSuccess", "maintenancePage.searchPlaceholder", "maintenancePage.clearFilters",
    "maintenancePage.dateFrom", "maintenancePage.dateTo", "maintenancePage.evidence", "maintenancePage.resultCount",
    "maintenancePage.invalidDateRange", "maintenancePage.activeFilters", "maintenancePage.filterStatus",
    "maintenancePage.queue.open", "maintenancePage.queue.completed", "maintenancePage.emptyTitle",
    "maintenancePage.emptyHelp", "maintenancePage.summaryOverdue", "maintenancePage.assignedTo",
    "maintenancePage.selectEmployee", "maintenancePage.unassigned", "maintenancePage.fileRequired",
    "maintenancePage.movementLabels.create", "maintenancePage.movementLabels.close",
    "maintenancePage.movementLabels.cancel", "maintenancePage.emptyHistoryTitle", "maintenancePage.emptyHistoryHelp",
    "maintenancePage.currentStatus", "maintenancePage.currentCondition", "maintenancePage.openAsset",
    "maintenancePage.disposalReviewTitle", "maintenancePage.disposalReviewCount", "maintenancePage.disposalReviewCost",
    "maintenancePage.disposalReviewRatio", "maintenancePage.openDisposalRequest", "maintenancePage.signatureDate",
    "maintenancePage.approver", "maintenancePage.closeSuccess", "maintenancePage.cancelSuccess",
    "maintenancePage.statusConsequences.completed", "maintenancePage.nextStatus",
    "disposalPage.resultCount", "disposalPage.selectAsset",
  ]
  const has = (tree: unknown, key: string) =>
    typeof key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], tree) === "string"
  assert.equal(unread.length, 76)
  for (const locale of ["th", "en"] as const) assert.deepEqual(unread.filter((key) => has(messages(locale), key)), [], locale)
  // Built at run time, so a literal search misses them: the system log presenter and the notification details.
  for (const key of ["systemLogPage.action_preview_notification_digest", "notifications.returnsDueSoonDetail", "notifications.licenseExpiringSoonDetail"]) {
    assert.ok(has(messages("th"), key) && has(messages("en"), key), key)
  }
})
```

  Existing pin, `tests/audit-finding-resolution.test.ts:71`: old `    assert.equal(typeof messages.auditFinding.comparison, "string")` → new `    assert.equal(messages.auditFinding.comparison, undefined)`.
- [ ] **Step 2: Watch it fail.** First confirm the list: `node <tools>/unused-message-keys.mjs D:/Antigravity/asset-system` prints `keys 4139 · unused 76` after CF-1 – CF-8 (`keys 4137 · unused 76` at `388d4d5`) and the same 76 `UNUSED` lines as the change file; if a task outside this area ran first and the list differs, stop and report. Then `node --test tests/phase2d-final-ui.test.ts tests/audit-finding-resolution.test.ts`. Expected to fail: "message keys that no code reads are gone from both languages; keys built at run time stay (plan 2D-5)" and "audit finding resolution copy is translated".
- [ ] **Step 3: Implement:** save the CF-9 change file as `<temp>/cf-9-messages.json` and run `node scripts/messages-edit.mjs <temp>/cf-9-messages.json` (prints `messages updated: 0 th, 0 en, 76 deleted`).
- [ ] **Step 4: Guard edits:** none.
- [ ] **Step 5: Verify.** `node --test tests/phase2d-final-ui.test.ts tests/audit-finding-resolution.test.ts tests/messages-parity.test.ts tests/messages-edit.test.ts tests/thai-glossary.test.ts tests/dead-code-cleanup.test.ts`; `node <tools>/unused-message-keys.mjs D:/Antigravity/asset-system` prints `keys 4063 · unused 0`; `node scripts/find-unused-messages.mjs` lists 188 keys (stderr `systemLogPage: 184`, `notifications: 4`); `npm test` (+1: 2168 / 2167 / 0 / 1); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.** `git add messages/th.json messages/en.json tests/audit-finding-resolution.test.ts tests/phase2d-final-ui.test.ts`, then `git commit -m "chore(i18n): delete the 76 message keys no code reads (2D-5 task 9, CF-9)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Message keys (area CF): the change files of Tasks 4–9

Every change goes through `node scripts/messages-edit.mjs <file>` with these files saved in `<temp>` (exact content):

`<temp>/cf-4-messages.json` (CF-4):

```json
{
  "delete": [
    "systemSettingsPage.generalSettings",
    "systemSettingsPage.selectCategory",
    "systemSettingsPage.accountingDepreciationPolicy",
    "systemSettingsPage.ldapSyncSchedulePreset"
  ]
}
```

`<temp>/cf-5-messages.json` (CF-5):

```json
{
  "set": {
    "th": {
      "systemSettingsPage.overviewDays": "{count} วัน",
      "systemSettingsPage.depreciationLegacyRuleMonths": "{months} เดือน",
      "systemSettingsPage.ldapSyncModePreview": "ดูตัวอย่างเท่านั้น",
      "systemSettingsPage.ldapSyncModeManual": "กดซิงก์เอง",
      "systemSettingsPage.ldapSyncModeScheduled": "ซิงก์ตามรอบเวลา"
    },
    "en": {
      "systemSettingsPage.overviewDays": "{count} days",
      "systemSettingsPage.depreciationLegacyRuleMonths": "{months} months",
      "systemSettingsPage.ldapSyncModePreview": "Preview",
      "systemSettingsPage.ldapSyncModeManual": "Manual",
      "systemSettingsPage.ldapSyncModeScheduled": "Scheduled"
    }
  }
}
```

`<temp>/cf-6-messages.json` (CF-6, with Step 3b's line):

```json
{
  "set": {
    "th": {
      "integrationApiPage.loading": "กำลังโหลดรายการ",
      "integrationApiPage.loadFailed": "โหลดรายการไม่สำเร็จ"
    }
  }
}
```

`<temp>/cf-7-messages.json` (CF-7):

```json
{
  "set": {
    "th": {
      "common.searchSelectResultCount": "พบ {count} รายการ"
    },
    "en": {
      "common.searchSelectResultCount": "{count, plural, one {# result} other {# results}}"
    }
  }
}
```

`<temp>/cf-9-messages.json` (CF-9, the 76 keys):

```json
{
  "delete": [
    "common.of",
    "nav.auditScan",
    "nav.auditResult",
    "nav.pendingAssets",
    "nav.notification",
    "asset.attachments",
    "asset.purchaseDocumentAmount",
    "asset.latestAudit",
    "asset.detailSections.nav",
    "asset.detailSections.ownership",
    "asset.detailSections.specs",
    "asset.detailSections.photos",
    "asset.detailSections.movement",
    "asset.detailSections.notes",
    "asset.removedAt",
    "brandModel.fileRequired",
    "brandModel.viewModels",
    "supplier.totalAmount",
    "auditScan.asset",
    "auditScan.selectAsset",
    "auditScan.cameraDevice",
    "auditScan.cameraDeviceFallback",
    "auditScan.cameraRear",
    "auditScan.actualLocation",
    "auditScan.actualCustodian",
    "auditScan.actualDepartment",
    "auditScan.actualCondition",
    "auditScan.wrongLocation",
    "auditScan.wrongCustodian",
    "auditScan.wrongCondition",
    "auditFinding.expectedValue",
    "auditFinding.actualValue",
    "auditFinding.comparison",
    "maintenancePage.subtitle",
    "maintenancePage.createTitle",
    "maintenancePage.createSubtitle",
    "maintenancePage.createSuccess",
    "maintenancePage.searchPlaceholder",
    "maintenancePage.clearFilters",
    "maintenancePage.dateFrom",
    "maintenancePage.dateTo",
    "maintenancePage.evidence",
    "maintenancePage.resultCount",
    "maintenancePage.invalidDateRange",
    "maintenancePage.activeFilters",
    "maintenancePage.filterStatus",
    "maintenancePage.queue.open",
    "maintenancePage.queue.completed",
    "maintenancePage.emptyTitle",
    "maintenancePage.emptyHelp",
    "maintenancePage.summaryOverdue",
    "maintenancePage.assignedTo",
    "maintenancePage.selectEmployee",
    "maintenancePage.unassigned",
    "maintenancePage.fileRequired",
    "maintenancePage.movementLabels.create",
    "maintenancePage.movementLabels.close",
    "maintenancePage.movementLabels.cancel",
    "maintenancePage.emptyHistoryTitle",
    "maintenancePage.emptyHistoryHelp",
    "maintenancePage.currentStatus",
    "maintenancePage.currentCondition",
    "maintenancePage.openAsset",
    "maintenancePage.disposalReviewTitle",
    "maintenancePage.disposalReviewCount",
    "maintenancePage.disposalReviewCost",
    "maintenancePage.disposalReviewRatio",
    "maintenancePage.openDisposalRequest",
    "maintenancePage.signatureDate",
    "maintenancePage.approver",
    "maintenancePage.closeSuccess",
    "maintenancePage.cancelSuccess",
    "maintenancePage.statusConsequences.completed",
    "maintenancePage.nextStatus",
    "disposalPage.resultCount",
    "disposalPage.selectAsset"
  ]
}
```

---

## Area VG: the shared EXEMPT check and the visual-foundation lock (Tasks 10–12)

Spec 2D §1 item 2, §5.1, §5.2, §5.3 (the VFG rows), §5.5, §8 item 1; D1, D13. VG-1 creates the one helper every guard file of this plan uses (`tests/helpers/guard-exempt.ts`, fixed interface) with its own unit test. VG-2 turns every VFG rule that had a budget or skipped a whole file into an exact `EXEMPT` list over all of `src`, deletes VFG's local `assertWithinBudget`, keeps the name `TABLE_HEADER_FILLS`, widens the scrim check to all of `src` and ends the file with VFG's phase 3 test. VG-3 widens VFG's two-file `leading-4` check to all of `src` and moves the one Thai label it finds (open issue VG-a).

- **Line numbers** are of `388d4d5`. VFG's lines move as VG-2 edits it; find each old text by its content.
- **Counts** were taken at `388d4d5` with the guard's own regexes by `<tools>/vg2-count.mjs` over a `git archive 388d4d5` copy (`<temp>/vg-tree`; `<temp>` = `scratchpad/p2d5-plan`).

### Inventory (VFG at `388d4d5`)

VFG already reads all of `src` (`const sources = readSourceFiles("src")`, VFG:6). Every site of every VFG rule, per file:

| Rule (VFG lines) | File | Sites | Decision | Why |
|---|---|---|---|---|
| R1 tone opacity (`TONE_OPACITY`, :230-236) | — | 0 | EXEMPT `{}` | budget `{}` since 2B plan 2 |
| R7 neutral fills (`TABLE_HEADER_FILLS`, :238-252) | — | 0 | EXEMPT `{}`, name kept | `{}` since plan 2D-3; the 2B scripts read the name (VG-R3) |
| R2 shadows (`SURFACE_SHADOW`, :254-268): 8 in 7 files | `c/ui/scanner-text-input.tsx` | 2: `:359` the zoom group, `:390` the torch button (`shadow-sm`) | EXEMPT permanent | over the live camera image (2A §9.8 #6; spec §5.3 "กล้อง 2") |
| | `c/audit/audit-scan-check-form.tsx` | 1: `:377` the queued photo's remove `Button` (`shadow-sm`) | EXEMPT permanent | over a photo thumbnail (2A §9.8 #6; §5.3 "ภาพถ่าย 1") |
| | `c/assets/asset-label-print.tsx` | 1: `:284` the label sheet (`shadow-sm`) | EXEMPT permanent | paper preview (2A §9.8 #6; §5.3 "กระดาษตัวอย่าง 3") |
| | `c/asset-operations/operation-document-print.tsx` | 1: `:92` the A4 page (`shadow-sm`) | EXEMPT permanent | paper preview (2A §9.8 #6; plan 2D-4 R17) |
| | `c/admin/system-settings-form.tsx` | 1: `:2570` the label sample of the label settings (`shadow-sm`) | EXEMPT permanent | paper preview (2A §9.8 #6; §5.3) |
| | `c/layout/mobile-field-navigation.tsx` | 1: `:72` the round scan button (`shadow-md`) | EXEMPT permanent | kept since phase 1 (phase 1 §15 #6; 2A §9.8 #9; §5.3 "ปุ่มสแกน 1") |
| | `c/assets/asset-register-table.tsx` | 1: `:475` the phone bulk-action bar `data-asset-bulk-bar` (`shadow-lg`) | EXEMPT **phase 3** | D2; 2B R-q (§5.3 "แถบเลือกหลายรายการของทะเบียน 1") |
| R3 text under 12px (:287-290, skipped the file through `allow`) | `c/assets/asset-label-print.tsx` | 3: `:330` `text-[10px]`, `:333` `text-[6.5px]`, `:334` `text-[7.5px]` | EXEMPT permanent | the thermal label prints at its physical size (2A §9.5; §5.3) |
| mockup sizes `text-[13px]` / `text-[28px]` (:176-181, skipped the file through `allow`) | `c/assets/asset-label-print.tsx` | 1: `:331` `text-[13px]` | EXEMPT permanent | the same label line on the large tape (2A §9.5) |
| `leading-4` (:291-294, two files only), counted in class strings | `c/ui/kbd.tsx` | 1: `:12` (the comment `:5` that explains it is not a class string) | EXEMPT permanent (VG-3) | Latin key names only (2A I23; DESIGN.md:422) |
| | `c/reports/responsive-report-list.tsx` | 1: `:66` the phone card label `text-xs font-medium leading-4` | **fix in this plan** (VG-3) | Thai column labels on a 16px line (DESIGN.md:310 Thai Line-Height Rule; :290 keeps `text-xs` for menus, the bottom bar and `Kbd`) |
| scrim `bg-black/NN` (:69-70, `c/ui/` only) | — | 0 in all of `src` | widened to all of `src` (VG-2) | spec §1 item 2 |
| focus ring tokens and see-through rings (:11-12), placeholder color (:173), `rounded-[6px]` (:182), `StatusBadge color=` and the dot helpers (:121-126), the three class-string rules (:189-207), emoji (:302) | — | 0 in all of `src` | stay `findMatches(…) == []` (VG-R2) | no file was ever allowed one |
| fonts load once (:32-33) | `src/app/layout.tsx` | 1 (the import line `:2`) | stays an exact one-file check | the root layout is the one place (owner-like by design) |
| `leading-tight` / `leading-none` (no VFG rule) | `c/admin/system-settings-form.tsx` 2 (`:2556`, `:2558`, the label sample), `c/layout/topbar.tsx` 1 (`:183`, the red count dot, pinned by R3), `c/ui/dialog.tsx` 1 (`:125`, the base `DialogTitle`) | 4 | not taken (VG-a) | paper preview; numbers only; overridden by callers through `cn` |

- No VFG rule has an OWNER (VG-R5): `scanner-text-input.tsx` is a shared part, but its shadows are there for the camera image, which §5.3 makes EXEMPT.
- Spec §5.1's example row names `c/audit/audit-scan-camera.tsx` with 2 camera shadows. At `388d4d5` that file has no shadow at all (its controls are flat), and the scanner's QR frame shade is an inline `boxShadow` in `c/audit/audit-scan-panels.tsx:161`, which R2 does not count (it counts classes; the raw-color guard of §5.4 may): the 2 camera shadows are `scanner-text-input.tsx`'s.
- VFG phase 3 rows after VG-2: 1 row, 1 site (R2, the register's bulk bar).
- Not in this area: FMG, LFG, `tests/list-filters-ui.test.ts`, the five new guards of §5.4 (a task that puts one of them into VFG follows VG-2 **Interfaces**), and `tests/ui-overlay-guards.test.ts` (VG-R7).

---

### Task 10 (VG-1): One EXEMPT check for the three guard files (`tests/helpers/guard-exempt.ts`, `tests/guard-exempt.test.ts`)

Spec §5.1 (exact counts both ways, `why` and `ruling` never empty, kind `permanent` or `phase 3`, a phase 3 sum), §5.2 (`OWNERS` apart from `EXEMPT`), §5.5 and D13 (one shared check instead of a local `assertWithinBudget` per file). The helper returns every problem as one line instead of asserting, so a guard that writes `assert.deepEqual(exemptProblems(…), [])` with no message of its own prints them all (a third argument to `assert.deepEqual` replaces that diff with the message: checked with `node --test`). It takes counts already taken, so a regex count (`countMatchesByFile`), a JSX count (`countByFile`) and a class-string count all work. No guard uses it yet. `tests/helpers/source-files.ts` does not change (`budgetOverruns` and `countMatchesByFile`'s `allow` stay for the guard tasks that still call them).

**Files:**
- Create: `tests/helpers/guard-exempt.ts` (LF, new)
- Create: `tests/guard-exempt.test.ts` (LF, new)

**Interfaces** (exact; every later guard task consumes them; plain TS imported as `"./helpers/guard-exempt.ts"`, with inline `type` specifiers as the repo's tests do, for example `import { exemptProblems, phase3Rows, type ExemptList } from "./helpers/guard-exempt.ts"`; a plain import of a type name fails under Node's type stripping):

```ts
export type ExemptKind = "permanent" | "phase 3"
export type ExemptEntry = { count: number; kind: ExemptKind; why: string; ruling: string }
export type ExemptList = Readonly<Record<string, ExemptEntry>>
export function exemptProblems(rule: string, counts: Readonly<Record<string, number>>, exempt: ExemptList, owners?: readonly string[]): string[]
export function phase3Rows(lists: Readonly<Record<string, ExemptList>>): Array<{ rule: string; file: string; count: number; why: string; ruling: string }>
```

- `counts`, `exempt` keys and `owners` are paths as `readSourceFiles` reports them (`src/components/…`, `/` separators). `rule` is the guard's own label for the rule (`R2`, `GF2`, `LT1`, …); a file that sums its phase 3 rows uses the same label as the key of that list.
- Problems, in this order: each counted file (count above 0) that is neither an owner nor in `exempt`, in `counts` order; then each `exempt` row in its order: an owner listed in `exempt` (then nothing else for that row); a count that is not a whole number above 0; a kind other than the two; an empty `why`; an empty `ruling`; a live count above the row ("move the new site to the shared part") or below it ("lower the row to N", or "delete the row" at 0). An owner may count anything and needs no row. A guard that wants its owners to be real files checks that itself (`existsSync`).

**Changes at 388d4d5:** two new files, no code site.

- [ ] **Step 1: The failing test.** Create `tests/guard-exempt.test.ts` (LF) with exactly:

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { exemptProblems, phase3Rows, type ExemptEntry, type ExemptList } from "./helpers/guard-exempt.ts"

// The shared EXEMPT check of the three guard files (spec 2D §5.1, §5.2, D1, D13): exact counts both ways, a why and a
// ruling on every row, kind "permanent" or "phase 3", owners apart from EXEMPT.
const row = (count: number, kind: ExemptEntry["kind"] = "permanent", why = "paper preview"): ExemptEntry => ({ count, kind, why, ruling: "2A §9.8 #6" })

test("exemptProblems passes when every counted file is an owner or an exact EXEMPT row", () => {
  assert.deepEqual(exemptProblems("R2", { "src/a.tsx": 2, "src/components/ui/b.tsx": 5, "src/zero.tsx": 0 }, { "src/a.tsx": row(2) }, ["src/components/ui/b.tsx"]), [])
  assert.deepEqual(exemptProblems("R2", {}, {}), [])
})

test("exemptProblems names a counted file that is neither an owner nor exempt", () => {
  assert.deepEqual(exemptProblems("R2", { "src/c.tsx": 1 }, {}), [
    "R2: src/c.tsx has 1, and it is not in EXEMPT (use the shared part; a site that must stay needs a row with its count, kind, why and ruling)",
  ])
})

test("exemptProblems holds every EXEMPT row to its exact live count, more or fewer", () => {
  const exempt = { "src/a.tsx": row(2), "src/b.tsx": row(3), "src/gone.tsx": row(1) }
  assert.deepEqual(exemptProblems("R2", { "src/a.tsx": 3, "src/b.tsx": 1 }, exempt), [
    "R2: src/a.tsx has 3, more than its EXEMPT count 2 (move the new site to the shared part)",
    "R2: src/b.tsx has 1, fewer than its EXEMPT count 3 (lower the row to 1)",
    "R2: src/gone.tsx has 0, fewer than its EXEMPT count 1 (delete the row)",
  ])
})

test("exemptProblems checks the row format: a count above 0, a known kind, a why and a ruling", () => {
  const bad = { "src/a.tsx": { count: 0, kind: "later", why: " ", ruling: "" } } as unknown as ExemptList
  assert.deepEqual(exemptProblems("R3", {}, bad), [
    "R3: src/a.tsx: count must be a whole number above 0, not 0",
    'R3: src/a.tsx: kind must be "permanent" or "phase 3", not "later"',
    "R3: src/a.tsx: why is empty",
    "R3: src/a.tsx: ruling is empty",
  ])
})

test("exemptProblems keeps owners out of EXEMPT", () => {
  const button = "src/components/ui/button.tsx"
  assert.deepEqual(exemptProblems("raw button", { [button]: 1 }, { [button]: row(1) }, [button]), [`raw button: ${button} is an owner, so it must not be in EXEMPT`])
})

test("phase3Rows lists the phase 3 rows of every rule, in order", () => {
  const lists = {
    R2: { "src/a.tsx": row(1), "src/bar.tsx": row(1, "phase 3", "bulk bar") },
    GL1: { "src/bar.tsx": row(2, "phase 3", "fixed bar") },
    R7: {},
  }
  assert.deepEqual(phase3Rows(lists), [
    { rule: "R2", file: "src/bar.tsx", count: 1, why: "bulk bar", ruling: "2A §9.8 #6" },
    { rule: "GL1", file: "src/bar.tsx", count: 2, why: "fixed bar", ruling: "2A §9.8 #6" },
  ])
  assert.deepEqual(phase3Rows({}), [])
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/guard-exempt.test.ts`. Expected: the file fails to load (`ERR_MODULE_NOT_FOUND` for `tests/helpers/guard-exempt.ts`), reported as one failed test `tests\guard-exempt.test.ts` (dry run: so).
- [ ] **Step 3: Implement.** Create `tests/helpers/guard-exempt.ts` (LF) with exactly:

```ts
// The one EXEMPT check of the three guard files (spec 2D §5.1, §5.2, D1, D13). A rule counts its matches per file over
// all of src. A file with a match is an owner (a shared part that writes the raw thing itself, §5.2) or an EXEMPT row
// with its exact count, why it stays, the ruling that keeps it and its kind: "permanent", or "phase 3" for a site that
// phase 3 takes. Every other file counts 0. exemptProblems returns every problem as one line, so a guard that asserts
// deepEqual(exemptProblems(…), []) with no message of its own prints them all.

export type ExemptKind = "permanent" | "phase 3"
export type ExemptEntry = { count: number; kind: ExemptKind; why: string; ruling: string }
export type ExemptList = Readonly<Record<string, ExemptEntry>>

const KINDS: readonly string[] = ["permanent", "phase 3"]

export function exemptProblems(
  rule: string,
  counts: Readonly<Record<string, number>>,
  exempt: ExemptList,
  owners: readonly string[] = [],
): string[] {
  const problems: string[] = []
  for (const [file, count] of Object.entries(counts)) {
    if (count > 0 && !owners.includes(file) && !Object.hasOwn(exempt, file)) {
      problems.push(`${rule}: ${file} has ${count}, and it is not in EXEMPT (use the shared part; a site that must stay needs a row with its count, kind, why and ruling)`)
    }
  }
  for (const [file, entry] of Object.entries(exempt)) {
    if (owners.includes(file)) {
      problems.push(`${rule}: ${file} is an owner, so it must not be in EXEMPT`)
      continue
    }
    if (!Number.isInteger(entry.count) || entry.count < 1) problems.push(`${rule}: ${file}: count must be a whole number above 0, not ${entry.count}`)
    if (!KINDS.includes(entry.kind)) problems.push(`${rule}: ${file}: kind must be "permanent" or "phase 3", not ${JSON.stringify(entry.kind)}`)
    if (typeof entry.why !== "string" || entry.why.trim() === "") problems.push(`${rule}: ${file}: why is empty`)
    if (typeof entry.ruling !== "string" || entry.ruling.trim() === "") problems.push(`${rule}: ${file}: ruling is empty`)
    const live = counts[file] ?? 0
    if (live > entry.count) problems.push(`${rule}: ${file} has ${live}, more than its EXEMPT count ${entry.count} (move the new site to the shared part)`)
    else if (live < entry.count) problems.push(`${rule}: ${file} has ${live}, fewer than its EXEMPT count ${entry.count} (${live === 0 ? "delete the row" : `lower the row to ${live}`})`)
  }
  return problems
}

// The "phase 3" rows of every list, rule by rule in the order given, so phase 3 knows how many sites it takes.
export function phase3Rows(lists: Readonly<Record<string, ExemptList>>): Array<{ rule: string; file: string; count: number; why: string; ruling: string }> {
  return Object.entries(lists).flatMap(([rule, list]) =>
    Object.entries(list)
      .filter(([, entry]) => entry.kind === "phase 3")
      .map(([file, entry]) => ({ rule, file, count: entry.count, why: entry.why, ruling: entry.ruling })),
  )
}
```

- [ ] **Step 4: Guard edits.** None: no guard uses the helper yet.
- [ ] **Step 5: Verify.** `node --test tests/guard-exempt.test.ts` (6 pass); `npm test` (+6 tests: 2174 tests, 2173 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`). `node <tools>/eol.mjs tests/helpers/guard-exempt.ts tests/guard-exempt.test.ts` prints `0 48` and `0 55` (LF).
- [ ] **Step 6: Commit.** `git add tests/helpers/guard-exempt.ts tests/guard-exempt.test.ts` (each prints "LF will be replaced by CRLF the next time Git touches it": expected, do not renormalize), then `git commit -m "test(guards): one EXEMPT check for the three guard files, with exact counts, a why, a ruling and a kind on every row (2D-5 task 10, VG-1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 11 (VG-2): The visual guards hold every kept site as an exact EXEMPT row and sum their phase 3 rows (`tests/visual-foundation-guards.test.ts`)

Spec §5.1, §5.3 (the R2 and R3 rows), §5.5 (one shared check; keep `TABLE_HEADER_FILLS`), §8 item 1, D1, D13. The three `assertWithinBudget` rules (R1, R7, R2) and the two rules that skipped a whole file through `allow` (R3 and the mockup sizes) become `exemptProblems(<rule>, countMatchesByFile(sources, <regex>), <list>)` over all of `src`, each list in the §5.1 format with the Inventory's rows. The local `assertWithinBudget` and its "Phase 2D sets every budget to {}" comment go; one header comment says what the lists mean. `TABLE_HEADER_FILLS` keeps its name and its one-line `= {}` (VG-R3). The scrim check reads all of `src` (0 sites). A new last test lists VFG's phase 3 rows (1 site) and their sum, and checks that every `const …: ExemptList =` of the file is in `EXEMPT_LISTS`. Every other test, pin and regex stays, and every test keeps its name (DESIGN.md:266, :283 and :336 quote four of them). No `src` file changes.

**Files:**
- Modify: `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`)

**Interfaces** (for every later task that adds a rule to VFG, such as a new guard of §5.4 placed here):
- `EXEMPT_LISTS: Readonly<Record<string, ExemptList>>` (not exported) and the test "phase 3: every row the visual guards leave to phase 3, and their sum (spec 2D §5.1, D2)" stay the last two things in the file.
- A new rule goes above the comment `// Every EXEMPT list of this file, by rule`. It declares its list as `const <NAME>: ExemptList = ` (that exact text at the start of a line, `{}` or a multi-line object), asserts `assert.deepEqual(exemptProblems("<label>", <counts>, <NAME>[, <OWNERS>]), [])`, and adds `<label>: <NAME>,` (quote a label with a space) to `EXEMPT_LISTS` in the same commit. A rule with `phase 3` rows also adds them to the test's expected array and its sum.
- In this plan those tasks are Task 12 (VG-3) and Tasks 23–27 (NG-6 to NG-10), all after this one.

**Changes at 388d4d5** (exact old → new in Steps 1 and 3; the decisions live in these rows):

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:3`–`:4` | no helper import | `import { exemptProblems, phase3Rows, type ExemptList } from "./helpers/guard-exempt.ts"` before the `source-files` import | D13 |
| after `:8` | — | the header comment on the lists (Step 3 edit 1) | §5.1 |
| `:69`–`:70` | `const ui = …startsWith("src/components/ui/")` and `findMatches(ui, /\bbg-black\/\d+/g)` | `findMatches(sources, …)` with a one-line comment; `ui` goes | §1 item 2 |
| `:176`–`:181` | `findMatches(…, (path) => path === "…asset-label-print.tsx")` with an assert message | `MOCKUP_TYPE_PX` and `MOCKUP_TYPE_PX_EXEMPT` (1 row) above the test; `exemptProblems("mockup sizes", …)` | §5.1; 2A §9.5 |
| `:209`–`:219` | the "Ratchet guards" comment and `function assertWithinBudget` | deleted | D13 |
| `:232`–`:236` | `assertWithinBudget(TONE_OPACITY, {})` | `TONE_OPACITY_EXEMPT: ExemptList = {}`; `exemptProblems("R1", …)` | D1 |
| `:241`–`:243`, `:251` | `TABLE_HEADER_FILLS: Record<string, number> = {}`; `assertWithinBudget(NEUTRAL_FILL_OPACITY, TABLE_HEADER_FILLS)` | `TABLE_HEADER_FILLS: ExemptList = {}` (name and one line kept, comment reworded); `exemptProblems("R7", …)` | §5.5 |
| `:255`–`:268` | the inline R2 budget object | `SURFACE_SHADOW_EXEMPT` (7 rows: 6 permanent with 7 sites, 1 phase 3 with 1 site); `exemptProblems("R2", …)` | §5.3 |
| `:287`–`:290` | `findMatches(sources, /text-\[…px\]/g, (path) => path === labelPrint)` | `SMALL_TEXT` and `SMALL_TEXT_EXEMPT` (1 row) above the test; `exemptProblems("R3", …)` | §5.3 |
| after `:303` | — | `EXEMPT_LISTS` and the phase 3 test | §5.1 |

The rows (exact; also in Step 3):

| List | File | count | kind | why | ruling |
|---|---|---|---|---|---|
| `SURFACE_SHADOW_EXEMPT` (R2) | `src/components/ui/scanner-text-input.tsx` | 2 | permanent | the zoom group and the torch button float over the live camera image | 2A §9.8 #6, 2D §5.3 |
| | `src/components/audit/audit-scan-check-form.tsx` | 1 | permanent | the remove button floats over a photo thumbnail | 2A §9.8 #6, 2D §5.3 |
| | `src/components/assets/asset-label-print.tsx` | 1 | permanent | the label sheet preview stands for the paper | 2A §9.8 #6, 2D §5.3 |
| | `src/components/asset-operations/operation-document-print.tsx` | 1 | permanent | the A4 page preview stands for the paper | 2A §9.8 #6, 2D-4 R17 |
| | `src/components/admin/system-settings-form.tsx` | 1 | permanent | the label sample of the label settings stands for the paper | 2A §9.8 #6, 2D §5.3 |
| | `src/components/layout/mobile-field-navigation.tsx` | 1 | permanent | the round scan button lifts out of the bottom bar | phase 1 §15 #6, 2A §9.8 #9 |
| | `src/components/assets/asset-register-table.tsx` | 1 | phase 3 | the phone bulk-action bar floats over the list, with its frame and place | 2D D2, 2B R-q |
| `SMALL_TEXT_EXEMPT` (R3) | `src/components/assets/asset-label-print.tsx` | 3 | permanent | the thermal label's name and detail lines print at their physical size | 2A §9.5 |
| `MOCKUP_TYPE_PX_EXEMPT` (mockup sizes) | `src/components/assets/asset-label-print.tsx` | 1 | permanent | the thermal label's name line on the large tape prints at its physical size | 2A §9.5 |
| `TONE_OPACITY_EXEMPT` (R1), `TABLE_HEADER_FILLS` (R7) | — | — | — | `{}` | — |

- [ ] **Step 1: The failing test.** Two exact edits:

  1. Imports. Old (`:3`–`:4`):

```ts
import test from "node:test"
import { countMatchesByFile, findMatches, readSourceFiles } from "./helpers/source-files.ts"
```

  New:

```ts
import test from "node:test"
import { exemptProblems, phase3Rows, type ExemptList } from "./helpers/guard-exempt.ts"
import { countMatchesByFile, findMatches, readSourceFiles } from "./helpers/source-files.ts"
```

  2. Append at the end of the file (after the emoji test, `:303`):

```ts

test("phase 3: every row the visual guards leave to phase 3, and their sum (spec 2D §5.1, D2)", () => {
  const rows = phase3Rows(EXEMPT_LISTS)
  assert.deepEqual(
    rows.map(({ rule, file, count }) => `${rule} ${file}: ${count}`),
    ["R2 src/components/assets/asset-register-table.tsx: 1"],
  )
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 1)
  // Every EXEMPT list this file declares is in EXEMPT_LISTS once, so the phase 3 rows of a later rule are summed here too.
  const source = read("tests/visual-foundation-guards.test.ts")
  const declared = [...source.matchAll(/^const (\w+): ExemptList = /gm)].map((match) => match[1])
  const registry = source.match(/^const EXEMPT_LISTS\b[^\n]*\n([\s\S]*?)^\}/m)?.[1] ?? ""
  assert.deepEqual(declared.filter((name) => !registry.includes(`: ${name},`)), [], "add each EXEMPT list to EXEMPT_LISTS")
  assert.equal(Object.keys(EXEMPT_LISTS).length, declared.length, "EXEMPT_LISTS holds each list once")
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/visual-foundation-guards.test.ts`. Expected to fail: "phase 3: every row the visual guards leave to phase 3, and their sum (spec 2D §5.1, D2)" (`ReferenceError: EXEMPT_LISTS is not defined`); the other 25 pass (dry run: 26 tests, 25 pass, 1 fail). The converted rules (R1, R7, R2, R3, the mockup sizes) pass before and after: they hold the same sites, now as exact rows, and every row equals its live count at `388d4d5`.
- [ ] **Step 3: Implement.** Nine exact edits (a CRLF file: exact-string replacement keeps its endings; never `sed -i`, which rewrites it with LF in Git Bash):

  1. After the `globals` line. Old (`:8`):

```ts
const globals = () => read("src/app/globals.css")
```

  New:

```ts
const globals = () => read("src/app/globals.css")

// Locked guards (spec 2D §5.1, D1, D13; tests/helpers/guard-exempt.ts). Every rule here reads all of src. A rule that
// lets a file keep a match counts its matches per file: such a file is a row of the rule's EXEMPT list with its exact
// count, why it stays, the ruling that keeps it and its kind, "permanent" or "phase 3" (the last test lists those), and
// every other file counts 0. A count that drops fails too: lower or delete the row in the commit that moves the site.
// A new site uses the shared part; a new row needs a ruling of its own.
```

  2. The scrim check. Old (`:69`–`:70`):

```ts
  const ui = sources.filter((file) => file.path.startsWith("src/components/ui/"))
  assert.deepEqual(findMatches(ui, /\bbg-black\/\d+/g), [])
```

  New:

```ts
  // Over all of src (spec 2D §1): a see-through black fill is a scrim of its own; overlays use bg-scrim.
  assert.deepEqual(findMatches(sources, /\bbg-black\/\d+/g), [])
```

  3. The mockup sizes. Old (`:176`–`:181`; the `rounded-[6px]` line `:182` and the closing `})` stay):

```ts
test("the mockup type sizes and the 6px radius are used through their tokens", () => {
  assert.deepEqual(
    findMatches(sources, /text-\[(?:13|28)px\]/g, (path) => path === "src/components/assets/asset-label-print.tsx"),
    [],
    "use text-meta (13px) or text-metric (28px); the thermal label keeps its own px sizes",
  )
```

  New:

```ts
// Use text-meta (13px) or text-metric (28px). The thermal label keeps its own px sizes.
const MOCKUP_TYPE_PX = /text-\[(?:13|28)px\]/g
const MOCKUP_TYPE_PX_EXEMPT: ExemptList = {
  "src/components/assets/asset-label-print.tsx": { count: 1, kind: "permanent", why: "the thermal label's name line on the large tape prints at its physical size", ruling: "2A §9.5" },
}

test("the mockup type sizes and the 6px radius are used through their tokens", () => {
  assert.deepEqual(exemptProblems("mockup sizes", countMatchesByFile(sources, MOCKUP_TYPE_PX), MOCKUP_TYPE_PX_EXEMPT), [])
```

  4. Delete the old ratchet comment and function with the blank line after it. Old (`:209`–`:219`; above it `:207` is the `})` of "big numbers, codes and faint text follow their token rules" and `:208` a blank line; below it `:220` is `test("countMatchesByFile counts matches per file and skips allowed paths", () => {`, which stays):

```ts
// Ratchet guards (UI phase 2A). A file missing from the budget may have no match; a listed file may have at most its number.
// Lower a number in the task that removes a site; never raise one. Phase 2D sets every budget to {}.
function assertWithinBudget(pattern: RegExp, budget: Record<string, number>, allow?: (path: string) => boolean) {
  const counts = countMatchesByFile(sources, pattern, allow)
  const over = Object.entries(counts)
    .filter(([path, count]) => count > (budget[path] ?? 0))
    .map(([path, count]) => `${path}: ${count} > ${budget[path] ?? 0}`)
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  assert.equal(over.length, 0, `${total} matches in ${Object.keys(counts).length} files; over budget:\n${over.join("\n")}`)
}

```

  New: nothing (the `})` line, one blank line, then the `countMatchesByFile` test).

  5. R1. Old (`:232`–`:236`; the first line is the end of the `TONE_OPACITY` regex):

```ts
  /(?<![\w-])(?:[\w\-\[\]=&\/]+:)*(?:bg|border|ring|text|divide|outline|fill|stroke|from|via|to|decoration|shadow|accent|caret|placeholder)-(?:primary|success|warning|danger|info|destructive)(?:-[a-z]+)?\/\d+/g

test("R1 tone colors never fade with opacity", () => {
  assertWithinBudget(TONE_OPACITY, {})
})
```

  New:

```ts
  /(?<![\w-])(?:[\w\-\[\]=&\/]+:)*(?:bg|border|ring|text|divide|outline|fill|stroke|from|via|to|decoration|shadow|accent|caret|placeholder)-(?:primary|success|warning|danger|info|destructive)(?:-[a-z]+)?\/\d+/g
const TONE_OPACITY_EXEMPT: ExemptList = {}

test("R1 tone colors never fade with opacity", () => {
  assert.deepEqual(exemptProblems("R1", countMatchesByFile(sources, TONE_OPACITY), TONE_OPACITY_EXEMPT), [])
})
```

  6. R7. Old (`:241`–`:243`):

```ts
// <th line filter of plans 2B-1 to 2B-4 is gone. The budget keeps its name, which the guard scripts of the 2B plans
// read (spec 2D §5.5). Plan 2D-3 moved its last row, the import preview table header, onto DataTable: it is {}.
const TABLE_HEADER_FILLS: Record<string, number> = {}
```

  New:

```ts
// <th line filter of plans 2B-1 to 2B-4 is gone. The EXEMPT list keeps its old name, which the guard scripts of the 2B
// plans read (spec 2D §5.5), and stays empty on one line: plan 2D-3 moved its last row, the import preview table header.
const TABLE_HEADER_FILLS: ExemptList = {}
```

  and old (`:251`) `  assertWithinBudget(NEUTRAL_FILL_OPACITY, TABLE_HEADER_FILLS)` → new `  assert.deepEqual(exemptProblems("R7", countMatchesByFile(sources, NEUTRAL_FILL_OPACITY), TABLE_HEADER_FILLS), [])`.

  7. R2. Old (`:255`–`:268`):

```ts
// controls drawn over the camera image or a photo, paper previews, and the few bars that later phases own.
const SURFACE_SHADOW = /(?<![\w-])(?:[\w\-\[\]=&\/]+:)*shadow-(?:sm|md|lg|xl|2xl)(?![\w-])/g

test("R2 only floating layers, camera controls and paper previews cast a shadow", () => {
  assertWithinBudget(SURFACE_SHADOW, {
    "src/components/ui/scanner-text-input.tsx": 2, // two controls over the camera image
    "src/components/audit/audit-scan-check-form.tsx": 1, // delete button over a photo thumbnail
    "src/components/assets/asset-label-print.tsx": 1, // label sheet preview
    "src/components/asset-operations/operation-document-print.tsx": 1, // A4 page preview
    "src/components/admin/system-settings-form.tsx": 1, // label preview
    "src/components/layout/mobile-field-navigation.tsx": 1, // round scan button shadow-md, kept since phase 1
    "src/components/assets/asset-register-table.tsx": 1, // mobile bulk-action bar shadow-lg (phase 3, R-q)
  })
})
```

  New:

```ts
// controls drawn over the camera image or a photo, paper previews, the round scan button, and the register's phone
// bulk-action bar until phase 3.
const SURFACE_SHADOW = /(?<![\w-])(?:[\w\-\[\]=&\/]+:)*shadow-(?:sm|md|lg|xl|2xl)(?![\w-])/g
const SURFACE_SHADOW_EXEMPT: ExemptList = {
  "src/components/ui/scanner-text-input.tsx": { count: 2, kind: "permanent", why: "the zoom group and the torch button float over the live camera image", ruling: "2A §9.8 #6, 2D §5.3" },
  "src/components/audit/audit-scan-check-form.tsx": { count: 1, kind: "permanent", why: "the remove button floats over a photo thumbnail", ruling: "2A §9.8 #6, 2D §5.3" },
  "src/components/assets/asset-label-print.tsx": { count: 1, kind: "permanent", why: "the label sheet preview stands for the paper", ruling: "2A §9.8 #6, 2D §5.3" },
  "src/components/asset-operations/operation-document-print.tsx": { count: 1, kind: "permanent", why: "the A4 page preview stands for the paper", ruling: "2A §9.8 #6, 2D-4 R17" },
  "src/components/admin/system-settings-form.tsx": { count: 1, kind: "permanent", why: "the label sample of the label settings stands for the paper", ruling: "2A §9.8 #6, 2D §5.3" },
  "src/components/layout/mobile-field-navigation.tsx": { count: 1, kind: "permanent", why: "the round scan button lifts out of the bottom bar", ruling: "phase 1 §15 #6, 2A §9.8 #9" },
  "src/components/assets/asset-register-table.tsx": { count: 1, kind: "phase 3", why: "the phone bulk-action bar floats over the list, with its frame and place", ruling: "2D D2, 2B R-q" },
}

test("R2 only floating layers, camera controls and paper previews cast a shadow", () => {
  assert.deepEqual(exemptProblems("R2", countMatchesByFile(sources, SURFACE_SHADOW), SURFACE_SHADOW_EXEMPT), [])
})
```

  8. R3. Old (`:287`–`:290`):

```ts
test("R3 no text smaller than 12px outside the thermal label", () => {
  // The thermal label prints at its physical size, so it keeps its own type scale. On screen the floor is text-xs (12px).
  const labelPrint = "src/components/assets/asset-label-print.tsx"
  assert.deepEqual(findMatches(sources, /text-\[(?:\d|1[01])(?:\.\d+)?px\]/g, (path) => path === labelPrint), [])
```

  New:

```ts
// R3: the thermal label prints at its physical size, so it keeps its own type scale. On screen the floor is text-xs (12px).
const SMALL_TEXT = /text-\[(?:\d|1[01])(?:\.\d+)?px\]/g
const SMALL_TEXT_EXEMPT: ExemptList = {
  "src/components/assets/asset-label-print.tsx": { count: 3, kind: "permanent", why: "the thermal label's name and detail lines print at their physical size", ruling: "2A §9.5" },
}

test("R3 no text smaller than 12px outside the thermal label", () => {
  assert.deepEqual(exemptProblems("R3", countMatchesByFile(sources, SMALL_TEXT), SMALL_TEXT_EXEMPT), [])
```

  9. The lists, before the phase 3 test of Step 1. Old (the emoji test's last line, the blank line and the phase 3 test's first line):

```ts
})

test("phase 3: every row the visual guards leave to phase 3, and their sum (spec 2D §5.1, D2)", () => {
```

  New:

```ts
})

// Every EXEMPT list of this file, by rule (spec 2D §5.1), last in the file. Each guard file sums its own phase 3 rows:
// a test file that imports another one runs that file's tests a second time.
const EXEMPT_LISTS: Readonly<Record<string, ExemptList>> = {
  R1: TONE_OPACITY_EXEMPT,
  R7: TABLE_HEADER_FILLS,
  R2: SURFACE_SHADOW_EXEMPT,
  R3: SMALL_TEXT_EXEMPT,
  "mockup sizes": MOCKUP_TYPE_PX_EXEMPT,
}

test("phase 3: every row the visual guards leave to phase 3, and their sum (spec 2D §5.1, D2)", () => {
```

  After this step `grep -n "assertWithinBudget" tests/visual-foundation-guards.test.ts` finds nothing, and the only `allow` callback left in the file is the one the `countMatchesByFile` helper test passes (`(path) => path === "src/a.tsx"`; that test stays: FMG still passes `allow`).
- [ ] **Step 4: Guard edits.** None in FMG or LFG. FMG `:116` (`// Same message as assertWithinBudget in visual-foundation-guards.test.ts, …`) names the function this task deletes; Task 16 (FG-4) removes that comment with FMG's own `assertWithinBudget`. Docs that call these rules budgets are Tasks 28, 29 and 32's: DESIGN.md:266 ("the ratchet guards `R1 …` and `R7 …`"), :336 ("holds these 8 in a per-file budget that may only go down": now 7 permanent rows and 1 phase 3 row, exact), :523 (`TABLE_HEADER_FILLS` "the budget"), DH :297 ("no `bg-black/NN` in `src/components/ui`": now all of `src`), DH :321 (R1, R2, R7 "use `assertWithinBudget`"), `docs/14_UI_UX_DESIGN_SYSTEM.md:99` ("per-file budgets … phase 2D sets every budget to `{}`").
- [ ] **Step 5: Verify.** `node --test tests/visual-foundation-guards.test.ts tests/guard-exempt.test.ts` (26 + 6 pass); `npm test` (+1 test: 2175 tests, 2174 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`). `node <tools>/eol.mjs tests/visual-foundation-guards.test.ts` prints the same number twice (`333 333`).
- [ ] **Step 6: Commit.** `git add tests/visual-foundation-guards.test.ts` then `git commit -m "test(guards): the visual guards hold every kept site as an exact EXEMPT row with a why, a ruling and a kind, and sum their phase 3 rows (2D-5 task 11, VG-2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 12 (VG-3): The report phone cards' labels drop `leading-4`, and the Thai line-height check reads all of `src` (`c/reports/responsive-report-list.tsx`, `tests/visual-foundation-guards.test.ts`)

Spec §1 item 2 (every guard reads all of `src`); DESIGN.md:310 (The Thai Line-Height Rule: no `leading-4` on Thai text); 2A §9.8 #12. VFG's R3 test checks `leading-4` in two files only (`:291`–`:294`, the two sites 2A fixed). Over all of `src` the class strings hold two more: `Kbd`'s own (`c/ui/kbd.tsx:12`, Latin key names only, kept by 2A I23: EXEMPT permanent) and the phone report card's column label (`c/reports/responsive-report-list.tsx:66`: Thai labels such as the report column names, 12px on a 16px line). The label takes `text-meta font-medium`, the size and weight of the `DataTable` head (`c/ui/data-table.tsx:15`) that the same label is from `md` (2D-4 R11; 13/20 is Thai-safe); its color stays. The rule counts class strings (one double-quoted string on one line, VFG's own convention since `:185`), so `Kbd`'s comment `:5` that names the class does not count. The value line (`:67`, `text-sm leading-5`), the card frame and the rest of the list stay. A guard file and the one site its widened rule forces share this commit.

**Files:**
- Modify: `src/components/reports/responsive-report-list.tsx` (`i/lf w/crlf`), `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`)
- Test (edit): `tests/reports-adaptive-ui.test.ts` (`i/lf w/crlf`)

**Changes at 388d4d5** (the VFG lines are of `388d4d5`; after VG-2 they sit lower, so find each by its text):

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `responsive-report-list.tsx:66` | `<dt className="text-xs font-medium leading-4 text-muted-foreground">{column.label}</dt>` | `<dt className="text-meta font-medium text-muted-foreground">{column.label}</dt>` | DESIGN.md:310, :290; 2D-4 R11 |
| VFG `:4` (`:5` after VG-2) | `import { countMatchesByFile, findMatches, readSourceFiles } from "./helpers/source-files.ts"` | `countByFile` first in the braces | — |
| VFG `:187` (after `stringsWhere`) | — | `classStringsByFile` (Step 1 edit 2) | VFG's class-string convention |
| VFG `:291`–`:294` | the two-file `leading-4` loop | `LEADING_4_EXEMPT` above the R3 test and one `exemptProblems("Thai leading", …)` line | §1 item 2; 2A I23 |
| VFG `EXEMPT_LISTS` | — | `"Thai leading": LEADING_4_EXEMPT,` after `R3` | VG-2 Interfaces |

The row (exact): `LEADING_4_EXEMPT` · `src/components/ui/kbd.tsx` · count 1 · permanent · why "a Kbd holds only Latin key names and arrows, never Thai text" · ruling "2A I23".

- [ ] **Step 1: The failing test.** Four exact edits in VFG and one pin:

  1. Old `import { countMatchesByFile, findMatches, readSourceFiles } from "./helpers/source-files.ts"` → new `import { countByFile, countMatchesByFile, findMatches, readSourceFiles } from "./helpers/source-files.ts"`.
  2. Old (`:187`):

```ts
const stringsWhere = (keep: (text: string) => boolean) => classStrings.filter(({ text }) => keep(text)).map(({ where }) => where)
```

  New:

```ts
const stringsWhere = (keep: (text: string) => boolean) => classStrings.filter(({ text }) => keep(text)).map(({ where }) => where)
const classStringsByFile = (keep: (text: string) => boolean) => countByFile(sources, (file) => [...file.source.matchAll(/"[^"\n]*"/g)].filter((match) => keep(match[0])).length)
```

  3. Old (VG-2's `SMALL_TEXT_EXEMPT` end and the R3 test's first lines, with the two-file loop):

```ts
  "src/components/assets/asset-label-print.tsx": { count: 3, kind: "permanent", why: "the thermal label's name and detail lines print at their physical size", ruling: "2A §9.5" },
}

test("R3 no text smaller than 12px outside the thermal label", () => {
  assert.deepEqual(exemptProblems("R3", countMatchesByFile(sources, SMALL_TEXT), SMALL_TEXT_EXEMPT), [])
  // leading-4 (16px) is below the Thai minimum of 1.44 × 12px; without it text-xs gets calc(18 / 12) on Thai pages.
  for (const path of ["src/components/admin/IntegrationClientManager.tsx", "src/components/ui/file-dropzone.tsx"]) {
    assert.doesNotMatch(read(path), /\bleading-4\b/, path)
  }
```

  New:

```ts
  "src/components/assets/asset-label-print.tsx": { count: 3, kind: "permanent", why: "the thermal label's name and detail lines print at their physical size", ruling: "2A §9.5" },
}
// leading-4 (16px) is below the Thai minimum of 1.44 × 12px; without it text-xs gets calc(18 / 12) on Thai pages.
// Counted in class strings, so a comment that names it does not count.
const LEADING_4_EXEMPT: ExemptList = {
  "src/components/ui/kbd.tsx": { count: 1, kind: "permanent", why: "a Kbd holds only Latin key names and arrows, never Thai text", ruling: "2A I23" },
}

test("R3 no text smaller than 12px outside the thermal label", () => {
  assert.deepEqual(exemptProblems("R3", countMatchesByFile(sources, SMALL_TEXT), SMALL_TEXT_EXEMPT), [])
  assert.deepEqual(exemptProblems("Thai leading", classStringsByFile((text) => /\bleading-4\b/.test(text)), LEADING_4_EXEMPT), [])
```

  4. Old `  R3: SMALL_TEXT_EXEMPT,` (in `EXEMPT_LISTS`) → new two lines `  R3: SMALL_TEXT_EXEMPT,` and `  "Thai leading": LEADING_4_EXEMPT,`.
  5. Pin, `tests/reports-adaptive-ui.test.ts:99`. Old:

```ts
  assert.match(responsiveList, /cn\("min-w-0", column\.mobileClassName\)/)
})
```

  New:

```ts
  assert.match(responsiveList, /cn\("min-w-0", column\.mobileClassName\)/)
  // A phone card's label is the table head's 13px label, with a Thai-safe line (no leading-4; plan 2D-5 task VG-3).
  assert.match(responsiveList, /<dt className="text-meta font-medium text-muted-foreground">\{column\.label\}<\/dt>/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/visual-foundation-guards.test.ts tests/reports-adaptive-ui.test.ts`. Expected to fail: "R3 no text smaller than 12px outside the thermal label" (`Thai leading: src/components/reports/responsive-report-list.tsx has 1, and it is not in EXEMPT …`) and "mobile report cards use two labelled columns with optional full-width fields" (dry run: these two; 44 of the 46 tests of the two files pass). The phase 3 test passes (the new list is in `EXEMPT_LISTS` and has no phase 3 row).
- [ ] **Step 3: Implement** the `responsive-report-list.tsx:66` row of the Changes table (exact string replacement).
- [ ] **Step 4: Guard edits.** None beyond Step 1. `tests/menu-primitives-ui.test.ts:178` keeps pinning `Kbd`'s class string (with `leading-4`); the per-part `leading-4` checks of `tests/list-primitives-ui.test.ts` and `tests/row-actions-ui.test.ts` stay.
- [ ] **Step 5: Verify.** `node --test tests/visual-foundation-guards.test.ts tests/reports-adaptive-ui.test.ts tests/menu-primitives-ui.test.ts tests/list-primitives-ui.test.ts tests/list-frame-guards.test.ts`; `npm test` (+0 tests: 2175 / 2174 / 0 / 1); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`). `node <tools>/eol.mjs` on the three files prints each number twice (`76 76`, `337 337`, `234 234`). Dev-app check (Task 31): `/th/reports` at 375, a report whose rows show as phone cards: the labels are 13px with no clipped marks, no horizontal page scroll.
- [ ] **Step 6: Commit.** `git add src/components/reports/responsive-report-list.tsx tests/visual-foundation-guards.test.ts tests/reports-adaptive-ui.test.ts` then `git commit -m "fix(ui): the report phone cards' labels drop leading-4 for the 13px table-head label, and the Thai line-height check reads all of src (2D-5 task 12, VG-3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

## Area FG: the form guards over all of src and their lock (Tasks 13–16, then 19)

Spec 2D §1 point 2, §3.5, §5.1, §5.2, §5.3 (the FMG rows), §5.5 (FMG lists, meta-test, GF5, GB3), §8 point 1; M18; the user's D1, D2, D13. Hand-ons: 2D-1 "FMG `BUSY_LABEL_SWAPS`" (DH 2D-1 Handed on), 2D-4 R18 "`DataFreshnessBanner` on the findings page (a `ui/` part, spec §5.5 GB3)", 2D-2/2D-3/2D-4 "Accepted until their plan" (the `LOADER2` and `FIXED_BOTTOM_BARS` sites kept on purpose).

- **FG-1** moves the one site the general GB3 rule finds (the findings page's freshness banner: its fresh-state refresh is a raw `<button>` with a spinning icon and both refresh buttons swap to "กำลังรีเฟรช") and turns GB3 into one rule over all of `src`; `BUSY_LABEL_SWAPS` goes.
- **FG-2** deletes the key that FG-1 leaves unread (`auditFinding.freshnessRefreshing`).
- **FG-3** (an addition, open issue FG-a) makes GB2 read every spinner in `src`, inside a button too, and stops the scanner input's two in-button spinners under reduced motion; the 2D-1 stopgap test `tests/spinner-motion-ui.test.ts` goes.
- **FG-4** is the lock (M18): every FMG rule counts over all of `src`; the budget rules become exact `EXEMPT` lists with `OWNERS`; `MIGRATED_FILES`, `BATCH_FILES`, `NEW_2C_FILES`, `PENDING_FOOTER_PARTS` and the local `assertWithinBudget` go; GF5 gains `c/ui/scanner-text-input.tsx` and covers every file; the meta-test checks the lists; a last test pins FMG's phase 3 rows.
- **FG-5** deletes `budgetOverruns` from `tests/helpers/source-files.ts` once no guard calls it.
- **Interfaces:** consumes `exemptProblems(rule, counts, exempt, owners?)`, `phase3Rows(lists)` and `type ExemptList` from `./helpers/guard-exempt.ts` (VG-1; one import line with an inline `type` specifier). Exports nothing (test files cannot import each other); FMG's phase 3 total for the docs is in its own last test: **4 rows, 5 sites**.
- **Counts** are of `388d4d5`, taken with the guard's own regexes and JSX reader over all of `src` (671 files): `<tools>/fg-inv.mts` and `<tools>/fg-count.mts` (run from the repo root with `node <script>`; read only).

### Inventory (FMG over all of `src` at `388d4d5`)

FMG reads `readSourceFiles("src")` (FMG:22) but skips every file outside the 66 of 2C through `notOwned` (`:112`) and runs five checks on `migratedSources()` only (`:113`). Rule by rule:

| Rule (FMG line) | At `388d4d5` (2C files) | All of `src` | Decision |
|---|---|---|---|
| GF1 `function Field(` (`LOCAL_FIELD` `:171`, test `:393`) | 0 | 1: `c/ui/field.tsx:32` | OWNER `c/ui/field.tsx`; `LOCAL_FIELD` `{}` |
| GF2 raw `<input>` / `<select>` / `<textarea>` (`RAW_FIELDS` `:184`, test `:397`) | 3 in 2 | 7 in 6 | 3 EXEMPT rows (2 `permanent`, 1 `phase 3`); OWNERS `c/ui/input.tsx`, `c/ui/native-select.tsx`, `c/ui/textarea.tsx` |
| GF3 field class strings (`FIELD_CLASS_STRINGS` `:200`, test `:401`) | 0 | 4 in 2 | 1 EXEMPT row (`phase 3`); OWNER `c/ui/field-variants.ts` (3) |
| GF4 star ↔ native `required` (test `:405`, `STAR_ONLY` `:150`), migrated files only | 0 problems | 0 problems: the 3 star-only fields of all of `src` are the 3 `STAR_ONLY` entries; no file is on the V track's `noValidate` + `validate(` yet | widened to all of `src`; `STAR_ONLY` stays (FG-R7) and the meta-test checks it is not stale |
| GF5 `CONSTRAINT_FLOORS` (`:214`, test `:425`), 38 files | every floor equals its live count | 39 files have a constraint: the 38 and `c/ui/scanner-text-input.tsx` [0, 1, 0] | add its row; every file with a constraint must have a row (FG-R6) |
| GF6 money fields (test `:437`), migrated only | 0 | 0 (14 `step="0.01"` fields, all `inputMode="decimal"`) | widened |
| GF7 old field markup (`OLD_MARKUP` `:266`, test `:447`) | 0 | 0 | `OLD_MARKUP` `{}` |
| GF8 a label wrapping a labelled part (test `:451`), migrated only | 0 | 0 | widened |
| GB1 `<Loader2` (`LOADER2` `:280`, test `:462`) | 11 in 9 | 21 in 15 | 13 EXEMPT rows (12 `permanent` with 17 sites, 1 `phase 3` with 2); OWNERS `c/ui/button.tsx`, `c/ui/search-field.tsx` |
| GB2 reduced motion (test `:466`), migrated only, spinners outside buttons | 0 | 0 in that form (2D-1 fixed the six); every line that spins: 3 (`c/ui/data-freshness-banner.tsx:73`, `c/ui/scanner-text-input.tsx:323`, `:397`) | every line of `src` (FG-3, open issue FG-a); `:73` goes in FG-1, `:323` and `:397` are fixed in FG-3 |
| GB3 busy label (test `:478`, `BUSY_LABEL_SWAPS` `:151`–`:161`), 8 files | 0 (every swap gone since 2D-1) | general rule (a busy `Button`/`button` never reads its busy value in its children; 82 busy buttons): 1, `c/ui/data-freshness-banner.tsx:87` | fixed in FG-1; `BUSY_LABEL_SWAPS` deleted |
| GB4 busy ≠ disabled (test `:486`) | all of `src` already: 0 | 0 | unchanged |
| GD1 X labels (test `:504`, `CLOSE_LABEL_IS_CANCEL` `:311`) | all of `src` already: 0 / 0 | 0 / 0 | `CLOSE_LABEL_IS_CANCEL` `{}` |
| GD2 footer part (test `:513`, `PENDING_FOOTER_PARTS` `:320`–`:330`, empty since 2C-5) | all of `src`: 0 | 0 (18 files with `AccessibleDialog`; `c/ui/accessible-dialog.tsx` defines it and stays skipped) | the empty list goes (FG-R8) |
| GD3, GD5, GD6 (tests `:528`, `:559`, `:574`) | all of `src` already: 0 | 0 | unchanged |
| GD4 order, `flex-col-reverse` (test `:543`, `REVERSE` `:307`) | order: all of `src`, 0; reverse: 2C files outside `ui/`, 0 | 0 and 0 (`ui/` included) | `REVERSE` `{}` over all of `src` |
| GL1 sticky footer routes and fixed bottom bars (test `:587`, `FIXED_BOTTOM_BARS` `:315`) | routes: 2 files, both focus routes; bars: 2 | bars: 3 (adds `c/layout/mobile-field-navigation.tsx:51`) | 3 EXEMPT rows (2 `permanent`, 1 `phase 3`), no owner (FG-R2) |
| GL2 form and list routes (test `:614`) | all dashboard routes | the same | unchanged |
| GL3 old helpers (`OLD_HELPERS` `:303`, test `:628`) | 0 | 0 | `OLD_HELPERS` `{}` |

Every counted site, per file:

| Rule | File | Sites (line at `388d4d5`) | Decision | Why / ruling |
|---|---|---|---|---|
| GF1 | `c/ui/field.tsx` | 1: `:32` `function Field(` | OWNER | the shared `Field` (§5.2) |
| GF2 | `c/assets/asset-label-print.tsx` | 2: `:221` `<input>`, `:233` `<select>` | EXEMPT `permanent` | the print toolbar's boxed fields: the label box carries the field look (2C K21, DESIGN.md Migration) |
| GF2 | `c/audit/audit-scan-room-picker.tsx` | 1: `:88` `<input type="search">` | EXEMPT `permanent` | the room sheet's search (2C O20) |
| GF2 | `c/layout/global-search.tsx` | 1: `:133` | EXEMPT `phase 3` | the topbar search combobox (D2) |
| GF2 | `c/ui/input.tsx` · `c/ui/native-select.tsx` · `c/ui/textarea.tsx` | 1 each: `:20`, `:13`, `:7` | OWNER | the shared controls (§5.2) |
| GF3 | `c/layout/global-search.tsx` | 1: `:140` | EXEMPT `phase 3` | the same combobox's classes (D2) |
| GF3 | `c/ui/field-variants.ts` | 3: `:12`, `:14`, `:16` | OWNER | the shared field classes (§5.2 names it) |
| GB1 | `c/admin/IntegrationClientManager.tsx` | 1: `:505` | EXEMPT `permanent` | the client list head's loading status (2C I27) |
| GB1 | `c/asset-operations/transaction-cancel-dialog.tsx` | 1: `:138` | EXEMPT `permanent` | the dialog body's loading line (I27) |
| GB1 | `c/assets/asset-component-manager.tsx` | 1: `:451` | EXEMPT `permanent` | the searching status line (I27) |
| GB1 | `c/assets/asset-label-batch-tool.tsx` | 2: `:317`, `:442` | EXEMPT `permanent` | the loading lines of the search results and the recent queue (I27) |
| GB1 | `c/assets/asset-scan-search-tool.tsx` | 1: `:147` | EXEMPT `permanent` | the results' loading line (I27) |
| GB1 | `c/audit/audit-scan-camera.tsx` | 1: `:148` | EXEMPT `permanent` (new, outside the 2C files) | the spinner on the camera box while it starts (I27) |
| GB1 | `c/audit/audit-scan-check-form.tsx` | 1: `:297` | EXEMPT `permanent` | the check sheet's components loading line (I27; audit mobile fix) |
| GB1 | `c/audit/audit-scan-lookup-card.tsx` | 1: `:48` | EXEMPT `permanent` (new) | the register search status line (I27) |
| GB1 | `c/disposal/disposal-asset-picker.tsx` | 1: `:67` | EXEMPT `permanent` | the spinner inside the picker's search field (I27 names this file) |
| GB1 | `c/disposal/disposal-bulk-approval.tsx` | 2: `:565`, `:566` | EXEMPT `permanent` | the preview and commit status lines in the dialog body (I27) |
| GB1 | `c/disposal/disposal-bulk-execution.tsx` | 1: `:976` (`BusyLabel` `:973`) | EXEMPT `permanent` | the status line in the dialog body (I27) |
| GB1 | `c/layout/global-search.tsx` | 2: `:150` (in its field), `:183` (results loading) | EXEMPT `phase 3` (new) | phase 3 rebuilds the topbar search (D2) |
| GB1 | `c/ui/scanner-text-input.tsx` | 4: `:323` (start button), `:354` (on the camera image), `:397` (torch button), `:409` (under the image) | EXEMPT `permanent` (new) | the shared scanner while the camera starts or the torch switches (I27; the camera controls are raw per §5.3) |
| GB1 | `c/ui/button.tsx` · `c/ui/search-field.tsx` | 1 each: `:23` (busy spinner), `:25` (`loading`) | OWNER | their job is that spinner (§5.2 names `search-field.tsx`) |
| GB2 (FG-3 form) | `c/ui/data-freshness-banner.tsx` | 1: `:73` (a `RefreshCw` that spins, in a template literal) | fix in FG-1 | the busy `Button` brings its own spinner |
| GB2 (FG-3 form) | `c/ui/scanner-text-input.tsx` | 2: `:323`, `:397` | fix in FG-3 | spinners in the start and torch buttons spin on under reduced motion |
| GB3 (general) | `c/ui/data-freshness-banner.tsx` | 1: `:87` `busy={refreshing}` with `{refreshing ? labels.refreshing : labels.refresh}` (`:89`); the fresh state's raw `<button disabled={refreshing}>` `:67`–`:75` swaps the same way | fix in FG-1 | 2C K13 (the busy label stays) |
| GF5 | `c/ui/scanner-text-input.tsx` | `maxLength={maxLength}` `:307` on its `Input` | new floor row [0, 1, 0] | §5.5 |
| GL1 | `c/assets/asset-register-table.tsx` | 1: `:475` | EXEMPT `phase 3` | the phone bulk-action bar (D2, 2B R-q) |
| GL1 | `c/layout/mobile-field-navigation.tsx` | 1: `:51` | EXEMPT `permanent` (new) | the phone bottom navigation (§5.3) |
| GL1 | `c/ui/action-bar.tsx` | 1: `:45` | EXEMPT `permanent` | the phone `ActionBar` (2C K23, §5.3) |

Totals after FG-4: 9 rules with an `EXEMPT` list (GF1, GF2, GF3, GF7, GB1, GD1, GD4, GL1, GL3), **20 rows with 27 sites**: 16 `permanent` rows (22 sites) and **4 `phase 3` rows (5 sites)**, three of them the topbar search; 4 rules with `OWNERS` (7 files, 9 sites). Spec §5.3 said "LOADER2 … 10 จุด (I27)": the recount over all of `src` is 17 `permanent` sites in 12 files (the 2C files' 11 sites, then the camera, the lookup card and the shared scanner input's 4, which FMG never read) plus the topbar search's 2. The other checks of FMG let no file keep a site and stay problem lists over all of `src` that print each site's file and line (FG-R1): GF4 (with `STAR_ONLY`), GF6, GF8, GB2, GB3, GB4, GD1's literal labels and primitives, GD2, GD3, the GD4 order, GD5, GD6, GL1's sticky footer routes and GL2; GF5 holds floors (FG-R6).

Not in this area: VFG, LFG, `tests/list-filters-ui.test.ts`, the five new guards of §5.4 (Tasks 23–27 put them in VFG; FMG's meta-test and phase 3 test take a rule added later, see FG-4 **Interfaces**), and the docs (Tasks 28–30, 32).

---

### Task 13 (FG-1): The findings page's fresh-data refresh is a busy Button that keeps its label, and GB3 reads every busy button in src (`c/ui/data-freshness-banner.tsx`, `D/audit/findings/page.tsx`)

Spec §5.5 (GB3: a general rule that catches `c/ui/data-freshness-banner.tsx:67-90`, or move that site first; both are done here: the site moves and the rule is general), 2C K13 (a busy button keeps its label), GB4 and 2D-4 R6 (busy instead of disabled while working; `h-8` → `sm`), 2D-4 R11 (`text-xs` sub-line → `text-meta`), M8 precedent (a busy label nobody reads is deleted with its pass line). The banner's fresh state (`DataFreshnessBanner`, only on `/audit/findings`) has a raw 32px `<button disabled={refreshing}>` with `disabled:opacity-60`, a `RefreshCw` that spins without `motion-reduce` and a label that swaps to `labels.refreshing`; the stale state's `Button busy` swaps the same label. Both become the busy `Button` of the stale state (outline; `sm` in the quiet fresh line, `md` in the warning `Notice` as now), the label stays "รีเฟรชข้อมูล", and the `refreshing` label prop goes from the banner and the page. GB3 becomes one rule over all of `src`: a `Button` or `button` with `busy={x}` never reads `x` in its children; `BUSY_LABEL_SWAPS` (2C's eight per-file regexes, all absent since 2D-1) goes. Stays: the stale `Notice` and its comment, `refreshData`, the 800 ms reset, the fresh help text and its success check icon (a status mark beside its words, FG-R4), the section layout, the other five labels (`freshTitle` is passed and not read: open issue FG-d).

**Files:**
- Modify: `src/components/ui/data-freshness-banner.tsx` (`i/lf w/crlf`), `src/app/[locale]/(dashboard)/audit/findings/page.tsx` (`i/lf w/crlf`)
- Test: `tests/feedback-states-ui.test.ts` (`i/lf w/lf`); guard: `tests/form-migration-guards.test.ts` (`i/lf w/crlf`)

**Changes at 388d4d5:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| banner `:15` | `  refreshing: string` | deleted | M8 precedent |
| banner `:62` | `<section className="mb-3 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-end">` | `text-xs` → `text-meta` | 2D-4 R11 |
| banner `:67`–`:75` | the raw `<button type="button" onClick={refreshData} disabled={refreshing} className="inline-flex h-8 … disabled:opacity-60">` with ``<RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />`` and `{refreshing ? labels.refreshing : labels.refresh}` | a one-line comment, then `<Button variant="outline" size="sm" busy={refreshing} onClick={refreshData}>` `<RefreshCw />` `{labels.refresh}` `</Button>` (exact block below) | K13, GB4, §5.4 #3 #4 |
| banner `:89` | `          {refreshing ? labels.refreshing : labels.refresh}` | `          {labels.refresh}` | K13 |
| page `:269` | `          refreshing: t("freshnessRefreshing"),` | deleted | M8 precedent |
| FMG `:151`–`:161` | `// K13: the label a button swapped to while busy. …` and `const BUSY_LABEL_SWAPS: Record<string, RegExp> = { … }` (8 rows) | deleted | §5.5 |
| FMG `:382` | `    BUSY_LABEL_SWAPS,` (in the meta-test's `ownedKeys`) | deleted | — |
| FMG `:478`–`:484` | GB3 over `BUSY_LABEL_SWAPS` | the general rule (Step 1) | §5.5 |

The banner's fresh block, old (`:62`–`:76`, LF shown):

```tsx
      <section className="mb-3 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-end">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
          <span className="truncate">{freshHelpText}</span>
        </span>
        <button
          type="button"
          onClick={refreshData}
          disabled={refreshing}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? labels.refreshing : labels.refresh}
        </button>
      </section>
```

New:

```tsx
      <section className="mb-3 flex flex-col gap-2 text-meta text-muted-foreground sm:flex-row sm:items-center sm:justify-end">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
          <span className="truncate">{freshHelpText}</span>
        </span>
        {/* The same busy Button as the stale state below: it keeps focus and its label while the page refreshes (2C K13). */}
        <Button variant="outline" size="sm" busy={refreshing} onClick={refreshData}>
          <RefreshCw />
          {labels.refresh}
        </Button>
      </section>
```

- [ ] **Step 1: The failing test.** Append to `tests/feedback-states-ui.test.ts` (LF; after the last test, `:193`):

```ts

// Plan 2D-5 (spec 2D §5.5 GB3, 2C K13): the fresh state's refresh is a busy Button like the stale state's, and neither
// changes its label while the page refreshes, so the label prop for "refreshing" is gone from the banner and the page.
test("DataFreshnessBanner: both refresh buttons are busy Buttons that keep their label (2C K13, spec 2D §5.5)", () => {
  const source = read("src/components/ui/data-freshness-banner.tsx")
  const fresh = source.slice(source.indexOf("  if (!stale) {"), source.lastIndexOf("  return ("))
  const stale = source.slice(source.lastIndexOf("  return ("))
  assert.match(fresh, /<section className="mb-3 flex flex-col gap-2 text-meta text-muted-foreground sm:flex-row sm:items-center sm:justify-end">/)
  assert.match(fresh, /<Button variant="outline" size="sm" busy=\{refreshing\} onClick=\{refreshData\}>\s*<RefreshCw \/>\s*\{labels\.refresh\}\s*<\/Button>/)
  assert.match(stale, /<Button variant="outline" size="md" busy=\{refreshing\} onClick=\{refreshData\}>\s*<RefreshCw \/>\s*\{labels\.refresh\}\s*<\/Button>/)
  assert.doesNotMatch(source, /<button|disabled|animate-spin|text-xs|labels\.refreshing|^\s+refreshing: string$/m)
  assert.doesNotMatch(read("src/app/[locale]/(dashboard)/audit/findings/page.tsx"), /freshnessRefreshing|^\s+refreshing:/m)
})
```

  Guard, `tests/form-migration-guards.test.ts`, three exact edits:
  1. Delete these 11 lines (`:151`–`:161`), keeping the line `// Files that render StickyFormFooter …` that follows:

```ts
// K13: the label a button swapped to while busy. Each expression occurs once in its file at 5ffee76.
const BUSY_LABEL_SWAPS: Record<string, RegExp> = {
  [`${C}admin/asset-state-review-dialog.tsx`]: /labels\.saving\b/,
  [`${C}asset-operations/checkin-form.tsx`]: /t\("legacyReturnCreating"\)/,
  [`${C}assets/asset-batch-form.tsx`]: /t\("batchCheckDuplicatesRunning"\)/,
  [`${C}assets/asset-component-manager.tsx`]: /labels\.(?:installing|removing)\b/,
  [`${C}assets/asset-status-correction-button.tsx`]: /labels\.submitting\b/,
  [`${C}auth/login-form.tsx`]: /t\("loggingIn"\)/,
  [`${C}assets/asset-import-preview-panel.tsx`]: /\$\{labels\.chooseFile\}\.\.\.|labels\.importing\b/,
  [`${C}assets/asset-label-print.tsx`]: /translations\.recordingPrint\b/,
}
```

  2. In the meta-test (`:382`), delete the line `    BUSY_LABEL_SWAPS,` (the `ownedKeys` entry between `FIXED_BOTTOM_BARS,` and `STICKY_FOOTER_ROUTES,`).
  3. Old GB3 (`:478`–`:484`):

```ts
test("GB3 a busy button keeps its label (K13)", () => {
  const problems: string[] = []
  for (const [path, swap] of Object.entries(BUSY_LABEL_SWAPS)) {
    if (migrated.has(path) && swap.test(read(path))) problems.push(`${path}: ${swap}`)
  }
  assert.deepEqual(problems, [])
})
```

  New:

```ts
// Plan 2D-5 (spec 2D §5.5): one rule over all of src instead of the 2C list of label swaps (BUSY_LABEL_SWAPS, all gone
// by plan 2D-1). A Button or button with busy={x} never reads x in its children: no "…ing" label, no second icon.
test("GB3 a busy button keeps its label (K13)", () => {
  const problems: string[] = []
  let busyButtons = 0
  for (const file of sources) {
    for (const button of [...findJsxElements(file.source, "Button"), ...findJsxElements(file.source, "button")]) {
      const busy = jsxAttrValue(button.text, "busy")?.trim()
      if (!busy) continue
      busyButtons++
      const expression = busy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*")
      if (new RegExp(`(?<![\\w.$])${expression}(?![\\w$])`).test(button.children ?? "")) problems.push(`${file.path}:${button.line}: the label reads busy={${busy}}`)
    }
  }
  assert.ok(busyButtons >= 50, `the reader found ${busyButtons} busy buttons, expected 50 or more`)
  assert.deepEqual(problems, [], "keep the label and the leading icon: busy shows the spinner (2C K13)")
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/feedback-states-ui.test.ts tests/form-migration-guards.test.ts` (33 tests). Expected to fail, 2: "DataFreshnessBanner: both refresh buttons are busy Buttons that keep their label (2C K13, spec 2D §5.5)" and "GB3 a busy button keeps its label (K13)", the latter with exactly one problem, `src/components/ui/data-freshness-banner.tsx:87: the label reads busy={refreshing}` (dry run: so). The other 31 pass.
- [ ] **Step 3: Implement** per the Changes table (CRLF files: exact-string edits with the Edit tool; never `sed -i`).
- [ ] **Step 4: Guard edits.** None beyond Step 1. VFG, LFG and the other FMG rules do not change: the banner never counted in them (GB1 counts `<Loader2`, not `RefreshCw`; the raw `<button>` and `disabled:opacity-60` are N3 and N4 of Tasks 25 and 26 (NG-8, NG-9), which then find no site here).
- [ ] **Step 5: Verify.** `node --test tests/feedback-states-ui.test.ts tests/form-migration-guards.test.ts tests/audit-finding-resolution.test.ts` (40 / 40); `npm test` (+1 test: 2176 tests, 2175 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`). `node <tools>/eol.mjs src/components/ui/data-freshness-banner.tsx "src/app/[locale]/(dashboard)/audit/findings/page.tsx" tests/form-migration-guards.test.ts tests/feedback-states-ui.test.ts` prints `92 92`, `754 754`, `628 628`, `0 206`. Dev-app check (Task 31): `/th/audit/findings` at 1440 and 375 within five minutes of loading, the fresh line: an outline button "รีเฟรชข้อมูล" (32px from `md`, 44px below), on click the spinner takes the icon's place, the label stays, focus stays on the button (`router.refresh()` is a GET).
- [ ] **Step 6: Commit.** `git add src/components/ui/data-freshness-banner.tsx "src/app/[locale]/(dashboard)/audit/findings/page.tsx" tests/feedback-states-ui.test.ts tests/form-migration-guards.test.ts` (the LF test file prints "LF will be replaced by CRLF the next time Git touches it": expected, do not renormalize), then `git commit -m "fix(ui): the findings page's fresh-data refresh is a busy Button that keeps its label, and GB3 reads every busy button in src (2D-5 task 13, FG-1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 14 (FG-2): Delete the refreshing label key nothing reads (`messages/th.json`, `messages/en.json`)

Spec §4.1 spirit and the M8 precedent (2D-1 deleted the ten busy label keys once no code read them; plan 2D-1 Task 5b). After FG-1 nothing reads `auditFinding.freshnessRefreshing` ("กำลังรีเฟรช" / "Refreshing"; after FG-1, `git grep -n freshnessRefreshing -- src tests scripts messages` lists one line in each of `messages/th.json` and `messages/en.json`, and the `doesNotMatch` of Task 13's test in `tests/feedback-states-ui.test.ts`, which is expected). Through the script, never by hand.

**Files:**
- Modify: `messages/th.json` (`i/lf w/crlf`), `messages/en.json` (`i/lf w/crlf`) through `node scripts/messages-edit.mjs`
- Test: `tests/dead-code-cleanup.test.ts` (`i/lf w/lf`)

**Changes at 388d4d5:** `messages/th.json` (line 2180 at `388d4d5`; line 2151 in both files when this task runs, after Task 9) `"freshnessRefreshing": "กำลังรีเฟรช",` and `messages/en.json` `"freshnessRefreshing": "Refreshing",` deleted (the script changes nothing else; dry run: one line out of each file).

- [ ] **Step 1: The failing test.** `tests/dead-code-cleanup.test.ts`, the key list of "the busy keys nobody reads are gone from both languages (spec 2D M8, M9)" (`:82`–`:83`). Old:

```ts
    "asset.latestMaintenance",
  ]
```

  New:

```ts
    "asset.latestMaintenance",
    // Plan 2D-5 (spec 2D §5.5 GB3): both refresh buttons of the findings page keep their label, so nothing reads this key.
    "auditFinding.freshnessRefreshing",
  ]
```

- [ ] **Step 2: Watch it fail.** `node --test tests/dead-code-cleanup.test.ts`. Expected to fail: "the busy keys nobody reads are gone from both languages (spec 2D M8, M9)" (`th auditFinding.freshnessRefreshing`); the other 6 pass.
- [ ] **Step 3: Implement.** Write `<temp>/fg2-messages.json` with exactly `{ "delete": ["auditFinding.freshnessRefreshing"] }` and run `node scripts/messages-edit.mjs <temp>/fg2-messages.json` (prints `messages updated: 0 th, 0 en, 1 deleted`). `git diff --stat messages` shows one line out of each file.
- [ ] **Step 4: Guard edits.** None.
- [ ] **Step 5: Verify.** `node --test tests/dead-code-cleanup.test.ts tests/audit-finding-resolution.test.ts tests/thai-glossary.test.ts` (all pass); `npm test` (+0: 2176 tests, 2175 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning). `node <tools>/eol.mjs messages/th.json messages/en.json tests/dead-code-cleanup.test.ts` prints `4242 4242` for each messages file (dry run; Task 9 changed their line counts) and `0 93` for the test file.
- [ ] **Step 6: Commit.** `git add messages/th.json messages/en.json tests/dead-code-cleanup.test.ts` then `git commit -m "chore(i18n): delete auditFinding.freshnessRefreshing, which nothing reads since both refresh buttons keep their label (2D-5 task 14, FG-2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 15 (FG-3): Every spinner in src stops under reduced motion, the scanner input's two in-button ones too (`c/ui/scanner-text-input.tsx`, `tests/form-migration-guards.test.ts`) — an addition, open issue FG-a

Spec §1 ("2D done": no hand-written UI left where the shared parts cover it), 2A reduced motion (DESIGN.md Busy: the spinner is "stopped under reduced motion"), 2D-1 (six spinners outside buttons fixed "so FMG GB2 can widen to all of `src`"; its stopgap test `tests/spinner-motion-ui.test.ts` says "until 2D-5 widens it"). GB2 skipped spinners inside a button because a busy `Button` brings its own, which stops; but a `Loader2` placed by hand inside a button spins on: the scanner input's start/stop button (`:323`) and torch button (`:397`). GB2 now reads every line of `src`: a line with `animate-spin` also has `motion-reduce:animate-none`. The two `Loader2`s get the class; the stopgap test goes (its four files are inside the new rule). Nothing else in the scanner input changes here (its raw buttons, `disabled:opacity-60` and camera colors are Task 20's, NG-1, which leaves these two lines as this task writes them).

**Files:**
- Modify: `src/components/ui/scanner-text-input.tsx` (`i/lf w/crlf`)
- Delete: `tests/spinner-motion-ui.test.ts` (`i/lf w/lf`, 1 test)
- Test: `tests/form-migration-guards.test.ts` (`i/lf w/crlf`)

**Changes at 388d4d5:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| scanner `:323` | `          {scannerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}` | `<Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />` | GB2 |
| scanner `:397` | `                  <Loader2 className="h-4 w-4 animate-spin" />` | `<Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />` | GB2 |

  The two old tags are the same text, `<Loader2 className="h-4 w-4 animate-spin" />`; replace both (and only those) with `<Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />`.

- [ ] **Step 1: The failing test.** FMG GB2. Old (`:466`–`:476` at `388d4d5`; `:454`–`:464` after FG-1):

```ts
test("GB2 a spinner outside a button stops for users who reduce motion", () => {
  const problems: string[] = []
  for (const file of migratedSources()) {
    const buttons = [...findJsxElements(file.source, "Button"), ...findJsxElements(file.source, "button")].filter((button) => button.children !== null)
    for (const loader of findJsxTags(file.source, ["Loader2"])) {
      const inButton = buttons.some((button) => loader.start >= button.end && loader.start < button.closeEnd)
      if (!inButton && !/\bmotion-reduce:animate-none\b/.test(loader.text)) problems.push(`${file.path}:${loader.line}`)
    }
  }
  assert.deepEqual(problems, [], "add motion-reduce:animate-none")
})
```

  New:

```ts
// Plan 2D-5: over all of src, and in a button too (a hand-placed spinner inside a raw button spins on as well). Busy
// Buttons bring their own spinner, which stops. Every line that spins (animate-spin) also stops under reduced motion.
test("GB2 every spinner stops for users who reduce motion, in a button or not", () => {
  const problems: string[] = []
  for (const file of sources) {
    file.source.split("\n").forEach((line, index) => {
      if (/\banimate-spin\b/.test(line) && !/\bmotion-reduce:animate-none\b/.test(line)) problems.push(`${file.path}:${index + 1}`)
    })
  }
  assert.deepEqual(problems, [], "add motion-reduce:animate-none to the class that spins, on the same line")
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/form-migration-guards.test.ts` (23 tests). Expected to fail: "GB2 every spinner stops for users who reduce motion, in a button or not", with exactly `src/components/ui/scanner-text-input.tsx:323` and `:397` (with FG-1 in; without it, `src/components/ui/data-freshness-banner.tsx:73` too, so run FG-1 first). The other 22 pass.
- [ ] **Step 3: Implement** per the Changes table, then delete `tests/spinner-motion-ui.test.ts` (`git rm tests/spinner-motion-ui.test.ts`).
- [ ] **Step 4: Guard edits.** None: GB1's `scanner-text-input.tsx` count (4 `<Loader2`) is unchanged; VFG R2 (`:260`, two camera controls) is unchanged.
- [ ] **Step 5: Verify.** `node --test tests/form-migration-guards.test.ts tests/scanner-text-input.test.ts tests/visual-foundation-guards.test.ts` (all pass); `npm test` (−1 test: 2175 tests, 2174 pass, 0 fail, 1 skipped; the stopgap file's one test goes, GB2 is the same test); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning). `node <tools>/eol.mjs src/components/ui/scanner-text-input.tsx tests/form-migration-guards.test.ts` prints `471 471` and `628 628`.
- [ ] **Step 6: Commit.** `git add src/components/ui/scanner-text-input.tsx tests/form-migration-guards.test.ts` (the `git rm` already staged the deletion) then `git commit -m "fix(a11y): the scanner input's start and torch spinners stop under reduced motion, and GB2 reads every spinner in src (2D-5 task 15, FG-3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 16 (FG-4): The form guards count over all of src with OWNERS and exact EXEMPT rows (`tests/form-migration-guards.test.ts`)

Spec §1 point 2, §5.1–§5.3, §5.5, §8 point 1, M18, D1, D2, D13. Every rule reads all of `src`: `notOwned` and `migratedSources()` go from every counter and check. The nine budget rules become `assert.deepEqual(listProblems(<id>, <counts>), [])` over the shared `exemptProblems` with `EXEMPT_LISTS[<id>]` and `OWNERS[<id>]`; each list keeps its name (DESIGN.md and the handoff name `RAW_FIELDS`, `LOADER2`, `FIXED_BOTTOM_BARS`) and holds the Inventory's rows in the §5.1 format. `BATCH_FILES`, `NEW_2C_FILES`, `MIGRATED_FILES`, `owned`, `migrated`, `notOwned`, `migratedSources`, the local `assertWithinBudget`, the batch group comments and the empty `PENDING_FOOTER_PARTS` go; the header comment says what the lists mean. GF5 adds the scanner input's floor and requires a floor row for every file with a constraint. The meta-test checks the lists instead of "no row outside 2C"; a last test pins the phase 3 rows. Stay: every regex, the JSX reader and its test (one `budgetOverruns` line out), `STAR_ONLY` (re-commented, FG-R7), `STICKY_FOOTER_ROUTES`, `TASK_ROUTES`, `dashboardRoutes`, GB2/GB3 (FG-3/FG-1), GB4, GD1's primitives check and literal labels, GD3, the GD4 order, GD5, GD6, GL1's sticky footer half, GL2. No `src` file changes.

**Files:**
- Modify: `tests/form-migration-guards.test.ts` (`i/lf w/crlf`)

**Interfaces** (for any later task that adds a rule to FMG): a rule that lets a file keep a site declares its list as `const <NAME>: ExemptList = {` at the start of a line, adds `<id>: <NAME>,` to `EXEMPT_LISTS` (and its shared parts to `OWNERS`), names its test `"<id> …"` (the meta-test takes the first word of every test title as an id) and checks with `assert.deepEqual(listProblems("<id>", counts), [])`; a `phase 3` row also joins the phase 3 test's array and sum. `EXEMPT_LISTS`, `OWNERS` and `listProblems` are not exported.

**Changes at 388d4d5** (line numbers at `388d4d5`; "when this task runs" = after FG-1 and FG-3 as written; the decisions are the rows):

| Line (388d4d5 → when this task runs) | Now | Becomes | Rule |
|---|---|---|---|
| `:1`–`:124` → `:1`–`:124` | imports with `budgetOverruns`; the "Phase 2C guards … sets the budgets to {}" header; `sources`, `C`; `BATCH_FILES`; `NEW_2C_FILES`; `MIGRATED_FILES` (64 lines); `owned` / `migrated` / `notOwned` / `migratedSources` / `read`; `assertWithinBudget` | the new imports (`readFileSync`, `exemptProblems`, `phase3Rows`, `type ExemptList`; no `budgetOverruns`), the lock header, `sources`, `C`, `read` (Step 3 edit 1) | D13, §5.5 |
| `:149` → `:149` | the `STAR_ONLY` comment | two lines naming the V track (Step 3 edit 2) | FG-R7 |
| `:168`–`:330` → `:157`–`:319` | "Budgets at 5ffee76" through `PENDING_FOOTER_PARTS` | the `EXEMPT` lists, `CONSTRAINT_FLOORS` (39 rows), `EXEMPT_LISTS`, `OWNERS`, `listProblems` (Step 3 edit 3) | §5.1–§5.3 |
| `:364` → `:353` | `assert.deepEqual(budgetOverruns(…), ["src/b.tsx: 1 > 0"])` | deleted | D13 |
| `:367`–`:391` → `:356`–`:379` | "the guard's own lists name real 2C files" | the list check (Step 1) | §5.5 |
| `:393`–`:403` → `:381`–`:391` | GF1–GF3 with `assertWithinBudget(…, notOwned)` | `listProblems`, new titles | §5.1 |
| `:407` → `:395` | GF4 `for (const file of migratedSources()) {` | `sources` | M18 |
| `:425`–`:435` → `:413`–`:423` | GF5 over the floor rows only | over every file (Step 3 edit 7) | §5.5 |
| `:439`, `:453` → `:427`, `:441` | GF6, GF8 `migratedSources()` | `sources` | M18 |
| `:447`–`:449`, `:462`–`:464` → `:435`–`:437`, `:450`–`:452` | GF7, GB1 with `assertWithinBudget` | `listProblems`, new titles | §5.1 |
| `:510`, `:556`, `:600`, `:629` → `:508`, `:554`, `:598`, `:627` | GD1, GD4, GL1, GL3 `assertWithinBudget(…)` | `assert.deepEqual(listProblems(…), [])` | §5.1 |
| `:513`–`:526` → `:511`–`:524` | GD2 with `PENDING_FOOTER_PARTS` | without it (Step 3 edit 11) | FG-R8 |
| end | — | the phase 3 test (Step 1) | §5.1 |

The rows (they live in Step 3 edit 3; recounted at `388d4d5`, FG-1 and FG-3 change none of them):

| List (rule) | Row | count | kind | why | ruling |
|---|---|---|---|---|---|
| `RAW_FIELDS` (GF2) | `c/assets/asset-label-print.tsx` | 2 | permanent | the print toolbar's two boxed fields, the print reason and the tape size: the label box carries the field look | 2C K21 |
| | `c/audit/audit-scan-room-picker.tsx` | 1 | permanent | the room search at the top of the room sheet | 2C O20 |
| | `c/layout/global-search.tsx` | 1 | phase 3 | the topbar search combobox | 2D D2 |
| `FIELD_CLASS_STRINGS` (GF3) | `c/layout/global-search.tsx` | 1 | phase 3 | the topbar search combobox's own field classes | 2D D2 |
| `LOADER2` (GB1) | `c/admin/IntegrationClientManager.tsx` | 1 | permanent | the loading status in the client list head | 2C I27 |
| | `c/asset-operations/transaction-cancel-dialog.tsx` | 1 | permanent | the loading line in the dialog body | 2C I27 |
| | `c/assets/asset-component-manager.tsx` | 1 | permanent | the searching status line | 2C I27 |
| | `c/assets/asset-label-batch-tool.tsx` | 2 | permanent | the loading lines of the search results and of the recent queue | 2C I27 |
| | `c/assets/asset-scan-search-tool.tsx` | 1 | permanent | the loading line of the results | 2C I27 |
| | `c/audit/audit-scan-camera.tsx` | 1 | permanent | the spinner on the camera box while the camera starts | 2C I27 |
| | `c/audit/audit-scan-check-form.tsx` | 1 | permanent | the components loading line of the check sheet | 2C I27 |
| | `c/audit/audit-scan-lookup-card.tsx` | 1 | permanent | the register search status line | 2C I27 |
| | `c/disposal/disposal-asset-picker.tsx` | 1 | permanent | the spinner inside the picker's search field | 2C I27 |
| | `c/disposal/disposal-bulk-approval.tsx` | 2 | permanent | the preview and commit status lines in the dialog body | 2C I27 |
| | `c/disposal/disposal-bulk-execution.tsx` | 1 | permanent | BusyLabel, the status line in the dialog body | 2C I27 |
| | `c/layout/global-search.tsx` | 2 | phase 3 | the topbar search: the spinner in its field and its results loading line | 2D D2 |
| | `c/ui/scanner-text-input.tsx` | 4 | permanent | the shared scanner while the camera starts or the torch switches: the start and torch buttons, the line on the camera image and the line under it | 2C I27 |
| `FIXED_BOTTOM_BARS` (GL1) | `c/assets/asset-register-table.tsx` | 1 | phase 3 | the register's phone bulk-action bar | 2D D2, 2B R-q |
| | `c/layout/mobile-field-navigation.tsx` | 1 | permanent | the phone bottom navigation | 2D §5.3 |
| | `c/ui/action-bar.tsx` | 1 | permanent | the phone ActionBar of the four detail pages | 2C K23 |
| `LOCAL_FIELD` (GF1), `OLD_MARKUP` (GF7), `CLOSE_LABEL_IS_CANCEL` (GD1), `REVERSE` (GD4), `OLD_HELPERS` (GL3) | — | — | — | `{}` | D1 |

`OWNERS`: GF1 `c/ui/field.tsx`; GF2 `c/ui/input.tsx`, `c/ui/native-select.tsx`, `c/ui/textarea.tsx`; GF3 `c/ui/field-variants.ts`; GB1 `c/ui/button.tsx`, `c/ui/search-field.tsx`. `CONSTRAINT_FLOORS`: the 38 rows of `388d4d5` in the same order and values without the batch comments, plus `c/ui/scanner-text-input.tsx` [0, 1, 0].

- [ ] **Step 1: The failing tests.** Two exact edits:
  1. The meta-test. Old (`:367`–`:391` at `388d4d5`, `:356`–`:379` when this task runs; the `BUSY_LABEL_SWAPS,` line already went in FG-1):

```ts
test("the guard's own lists name real 2C files", () => {
  const exists = (path: string) => sources.some((file) => file.path === path)
  const problems: string[] = []
  for (const path of Object.values(BATCH_FILES).flat()) if (!exists(C + path)) problems.push(`BATCH_FILES: ${path} not found`)
  for (const path of MIGRATED_FILES) if (!owned.has(path)) problems.push(`MIGRATED_FILES: ${path} is not a 2C file`)
  const ownedKeys = {
    LOCAL_FIELD,
    RAW_FIELDS,
    FIELD_CLASS_STRINGS,
    CONSTRAINT_FLOORS,
    OLD_MARKUP,
    LOADER2,
    OLD_HELPERS,
    CLOSE_LABEL_IS_CANCEL,
    FIXED_BOTTOM_BARS,
    STICKY_FOOTER_ROUTES,
  }
  for (const [name, budget] of Object.entries(ownedKeys)) {
    for (const path of Object.keys(budget)) if (!owned.has(path)) problems.push(`${name}: ${path} is not a 2C file`)
  }
  for (const path of Object.keys(REVERSE)) if (!owned.has(path) && !path.startsWith(`${C}ui/`)) problems.push(`REVERSE: ${path} is outside the 2C files and ui/`)
  for (const path of PENDING_FOOTER_PARTS) if (!owned.has(path)) problems.push(`PENDING_FOOTER_PARTS: ${path} is not a 2C file`)
  assert.deepEqual(problems, [])
})
```

  New:

```ts
test("the guard's own lists name real files, and every EXEMPT row has a count, a kind, a why and a ruling (spec 2D §5.1)", () => {
  const exists = (path: string) => sources.some((file) => file.path === path)
  const problems: string[] = []
  for (const [rule, list] of Object.entries(EXEMPT_LISTS)) {
    // Held against its own counts, a list shows only its format problems: count, kind, why, ruling, an owner as a row.
    problems.push(...exemptProblems(rule, Object.fromEntries(Object.entries(list).map(([path, entry]) => [path, entry.count])), list, OWNERS[rule]))
    for (const path of Object.keys(list)) if (!exists(path)) problems.push(`${rule}: EXEMPT ${path} not found`)
  }
  for (const [rule, owners] of Object.entries(OWNERS)) {
    if (!Object.hasOwn(EXEMPT_LISTS, rule)) problems.push(`OWNERS: ${rule} has no EXEMPT list`)
    for (const path of owners) if (!exists(path)) problems.push(`${rule}: owner ${path} not found`)
  }
  // Every list belongs to a test of this file, and every `const …: ExemptList =` of the file is in EXEMPT_LISTS.
  const self = readFileSync("tests/form-migration-guards.test.ts", "utf8").replace(/\r\n/g, "\n")
  const ruleIds = new Set([...self.matchAll(/^test\("(\S+) /gm)].map((match) => match[1]))
  for (const rule of Object.keys(EXEMPT_LISTS)) if (!ruleIds.has(rule)) problems.push(`EXEMPT_LISTS: no test is named ${rule}`)
  const declared = [...self.matchAll(/^const (\w+): ExemptList = /gm)].map((match) => match[1])
  if (declared.length !== Object.keys(EXEMPT_LISTS).length) problems.push(`EXEMPT_LISTS holds ${Object.keys(EXEMPT_LISTS).length} lists; the file declares ${declared.join(", ")}`)
  for (const path of Object.keys(CONSTRAINT_FLOORS)) if (!exists(path)) problems.push(`CONSTRAINT_FLOORS: ${path} not found`)
  for (const path of Object.keys(STICKY_FOOTER_ROUTES)) if (!exists(path)) problems.push(`STICKY_FOOTER_ROUTES: ${path} not found`)
  // A STAR_ONLY entry is still a Field with the star whose control has no native required; the V track removes it.
  for (const key of STAR_ONLY) {
    const [path, label] = [key.slice(0, key.indexOf("|")), key.slice(key.indexOf("|") + 1)]
    const field = findJsxElements(read(path), "Field").find((element) => jsxAttrValue(element.text, "label") === label && hasJsxAttr(element.text, "required"))
    const control = findJsxTags(field?.children ?? "", CONTROL_TAGS).find((tag) => !/^(?:checkbox|radio|hidden)$/.test(jsxAttrValue(tag.text, "type") ?? ""))
    if (!control || hasJsxAttr(control.text, "required")) problems.push(`STAR_ONLY: ${key} is not a star without native required any more; remove it`)
  }
  assert.deepEqual(problems, [])
})
```

  2. Append at the end of the file (after GL3):

```ts

test("phase 3: every row the form guards leave to phase 3, and their sum (spec 2D §5.1, D2)", () => {
  const rows = phase3Rows(EXEMPT_LISTS)
  assert.deepEqual(rows.map(({ rule, file, count }) => `${rule} ${file}: ${count}`), [
    "GF2 src/components/layout/global-search.tsx: 1",
    "GF3 src/components/layout/global-search.tsx: 1",
    "GB1 src/components/layout/global-search.tsx: 2",
    "GL1 src/components/assets/asset-register-table.tsx: 1",
  ])
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 5)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/form-migration-guards.test.ts` (24 tests). Expected to fail, 2: "the guard's own lists name real files, and every EXEMPT row has a count, a kind, a why and a ruling (spec 2D §5.1)" (`ReferenceError: EXEMPT_LISTS is not defined`) and "phase 3: every row the form guards leave to phase 3, and their sum (spec 2D §5.1, D2)" (`ReferenceError: phase3Rows is not defined`). The other 22 pass before and after Step 3: the converted rules hold the same sites as exact rows (every row equals its live count at `388d4d5` with FG-1 and FG-3), and the widened checks find nothing outside the old scope.
- [ ] **Step 3: Implement.** Eleven exact edits and a check (CRLF file: the Edit tool keeps its endings; for the two range edits, select from the first quoted line through the last quoted line and replace the whole range):

  1. **Range** from line 1 `import assert from "node:assert/strict"` through line 124, the `}` that closes `function assertWithinBudget` (its last three lines are `` `${what}: … Phase 2D widens every guard to all of src and sets the budgets to {}.`, ``, `  )`, `}`), 124 lines, replaced by exactly:

```ts
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import { getMobileShellMode } from "../src/lib/mobile-field-navigation.ts"
import { exemptProblems, phase3Rows, type ExemptList } from "./helpers/guard-exempt.ts"
import {
  countByFile,
  countMatchesByFile,
  findJsxElements,
  findJsxTags,
  findMatches,
  hasJsxAttr,
  jsxAttrValue,
  readSourceFiles,
} from "./helpers/source-files.ts"

// The phase 2C form guards (spec 2C §9), locked by plan 2D-5 (spec 2D §5.1, §5.2, §5.5, D1, D13). Every rule reads all
// of src. A rule that lets a file keep a site counts its sites per file: that file is an owner (a shared part that must
// write the markup itself, OWNERS) or a row of the rule's EXEMPT list with its exact count, why it stays, the ruling that
// keeps it and its kind, "permanent" or "phase 3" (the last test lists those); every other file counts 0. A count that
// drops fails too: lower or delete the row in the commit that moves the site. A new site uses the shared part, never a
// new row. Two lists are not budgets: CONSTRAINT_FLOORS only protect, and STAR_ONLY's three stars wait for the V track.
const sources = readSourceFiles("src")
const C = "src/components/"
const read = (path: string) => sources.find((file) => file.path === path)?.source ?? ""
```

  2. The `STAR_ONLY` comment (`:149`). Old:

```ts
// The star that the server enforces while the control has no required (spec §4.3 F5), keyed by the label expression, not a line number.
```

  New:

```ts
// The stars that the server enforces while the control has no required (spec 2C §4.3 F5), keyed by the label expression,
// not a line number. The V track adds required and then removes the entry (the meta-test fails while one is stale).
```

  3. **Range** from the line `// ---- Budgets at 5ffee76 (spec §9.4). "→ n" = what stays after the file's own task, and why.` (`:168` at `388d4d5`, `:157` when this task runs) through the `])` that closes `const PENDING_FOOTER_PARTS = new Set<string>([` (`:330` / `:319`), 163 lines, replaced by exactly:

```ts
// ---- EXEMPT lists (spec 2D §5.1) and OWNERS (§5.2), by rule, recounted over all of src at 388d4d5. A why or a ruling
// never holds a line number (lines move).

// GF1 `function Field(` per file
const LOCAL_FIELD: ExemptList = {}

// GF2 hand-written <input> (not checkbox/radio/hidden/file), <select> and <textarea>
const RAW_FIELDS: ExemptList = {
  [`${C}assets/asset-label-print.tsx`]: { count: 2, kind: "permanent", why: "the print toolbar's two boxed fields, the print reason and the tape size: the label box carries the field look", ruling: "2C K21" },
  [`${C}audit/audit-scan-room-picker.tsx`]: { count: 1, kind: "permanent", why: "the room search at the top of the room sheet", ruling: "2C O20" },
  [`${C}layout/global-search.tsx`]: { count: 1, kind: "phase 3", why: "the topbar search combobox", ruling: "2D D2" },
}

// GF3 hand-written field class strings
const FIELD_CLASS_STRINGS: ExemptList = {
  [`${C}layout/global-search.tsx`]: { count: 1, kind: "phase 3", why: "the topbar search combobox's own field classes", ruling: "2D D2" },
}

// GF5 floors per file: [required, maxLength, minLength] on CONSTRAINT_TAGS. Every file of src that has one of them holds
// a row (a new form adds its row), and a floor never drops.
const CONSTRAINT_FLOORS: Record<string, readonly [number, number, number]> = {
  [`${C}maintenance/maintenance-plan-form.tsx`]: [4, 2, 0],
  [`${C}maintenance/repair-record-form.tsx`]: [2, 3, 0],
  [`${C}maintenance/repair-record-actions.tsx`]: [3, 6, 0],
  [`${C}asset-operations/checkin-form.tsx`]: [4, 0, 0],
  [`${C}asset-operations/checkout-form.tsx`]: [6, 0, 0],
  [`${C}asset-operations/transfer-form.tsx`]: [1, 1, 0],
  [`${C}asset-operations/bulk-move-form.tsx`]: [1, 1, 0],
  [`${C}disposal/disposal-request-form.tsx`]: [3, 1, 1],
  [`${C}disposal/disposal-batch-form.tsx`]: [1, 1, 1],
  [`${C}disposal/disposal-execution-button.tsx`]: [8, 4, 1],
  [`${C}disposal/disposal-decision-button.tsx`]: [3, 1, 0],
  [`${C}audit/audit-finding-review-actions.tsx`]: [1, 3, 0],
  [`${C}master-data/asset-model-form.tsx`]: [3, 1, 0],
  [`${C}assets/asset-form.tsx`]: [12, 10, 0],
  [`${C}assets/asset-batch-form.tsx`]: [10, 5, 0],
  [`${C}assets/asset-component-manager.tsx`]: [0, 4, 0],
  [`${C}admin/system-settings-form.tsx`]: [0, 1, 0],
  [`${C}master-data/branch-form.tsx`]: [3, 4, 0],
  [`${C}master-data/brand-form.tsx`]: [1, 1, 0],
  [`${C}master-data/category-form.tsx`]: [4, 7, 0],
  [`${C}master-data/company-form.tsx`]: [2, 6, 0],
  [`${C}master-data/department-form.tsx`]: [2, 2, 0],
  [`${C}master-data/employee-form.tsx`]: [6, 5, 0],
  [`${C}master-data/location-form.tsx`]: [4, 3, 0],
  [`${C}master-data/supplier-form.tsx`]: [2, 6, 0],
  [`${C}disposal/disposal-bulk-approval.tsx`]: [0, 1, 0],
  [`${C}disposal/disposal-bulk-execution.tsx`]: [5, 2, 1],
  [`${C}audit/audit-round-form.tsx`]: [7, 1, 0],
  [`${C}audit/audit-round-cancel-button.tsx`]: [1, 0, 0],
  [`${C}admin/admin-user-form.tsx`]: [3, 4, 1],
  [`${C}admin/role-permission-form.tsx`]: [2, 3, 0],
  [`${C}admin/IntegrationClientManager.tsx`]: [3, 3, 1],
  [`${C}admin/asset-state-review-dialog.tsx`]: [1, 1, 1],
  [`${C}assets/asset-label-print.tsx`]: [0, 1, 0],
  [`${C}assets/asset-register-table.tsx`]: [1, 1, 0],
  [`${C}asset-operations/transaction-cancel-dialog.tsx`]: [0, 1, 0],
  [`${C}auth/login-form.tsx`]: [2, 0, 0],
  [`${C}reports/report-preset-controls.tsx`]: [0, 1, 0],
  // Plan 2D-5 (spec 2D §5.5): the shared scanner input passes maxLength to its Input.
  [`${C}ui/scanner-text-input.tsx`]: [0, 1, 0],
}

// GF7 old label span, red star, legend and checkbox markup
const OLD_MARKUP: ExemptList = {}

// GB1 <Loader2 tags (every tag, also icons kept in a variable). A busy Button brings its own spinner (an owner).
const LOADER2: ExemptList = {
  [`${C}admin/IntegrationClientManager.tsx`]: { count: 1, kind: "permanent", why: "the loading status in the client list head", ruling: "2C I27" },
  [`${C}asset-operations/transaction-cancel-dialog.tsx`]: { count: 1, kind: "permanent", why: "the loading line in the dialog body", ruling: "2C I27" },
  [`${C}assets/asset-component-manager.tsx`]: { count: 1, kind: "permanent", why: "the searching status line", ruling: "2C I27" },
  [`${C}assets/asset-label-batch-tool.tsx`]: { count: 2, kind: "permanent", why: "the loading lines of the search results and of the recent queue", ruling: "2C I27" },
  [`${C}assets/asset-scan-search-tool.tsx`]: { count: 1, kind: "permanent", why: "the loading line of the results", ruling: "2C I27" },
  [`${C}audit/audit-scan-camera.tsx`]: { count: 1, kind: "permanent", why: "the spinner on the camera box while the camera starts", ruling: "2C I27" },
  [`${C}audit/audit-scan-check-form.tsx`]: { count: 1, kind: "permanent", why: "the components loading line of the check sheet", ruling: "2C I27" },
  [`${C}audit/audit-scan-lookup-card.tsx`]: { count: 1, kind: "permanent", why: "the register search status line", ruling: "2C I27" },
  [`${C}disposal/disposal-asset-picker.tsx`]: { count: 1, kind: "permanent", why: "the spinner inside the picker's search field", ruling: "2C I27" },
  [`${C}disposal/disposal-bulk-approval.tsx`]: { count: 2, kind: "permanent", why: "the preview and commit status lines in the dialog body", ruling: "2C I27" },
  [`${C}disposal/disposal-bulk-execution.tsx`]: { count: 1, kind: "permanent", why: "BusyLabel, the status line in the dialog body", ruling: "2C I27" },
  [`${C}layout/global-search.tsx`]: { count: 2, kind: "phase 3", why: "the topbar search: the spinner in its field and its results loading line", ruling: "2D D2" },
  [`${C}ui/scanner-text-input.tsx`]: { count: 4, kind: "permanent", why: "the shared scanner while the camera starts or the torch switches: the start and torch buttons, the line on the camera image and the line under it", ruling: "2C I27" },
}

// GL3 old helpers: FormStep, WizardStep, Choice, AssetStateFieldLabel and the batch asset tag help label
const OLD_HELPERS: ExemptList = {}

// GD4 flex-col-reverse (K8: the DOM order is the visual order)
const REVERSE: ExemptList = {}

// GD1 closeLabel={…cancel…}: the X read "Cancel"
const CLOSE_LABEL_IS_CANCEL: ExemptList = {}

// GL1 class strings with both fixed and bottom-. No owner: each of the two shared bars is an exact row (spec 2D §5.3).
const FIXED_BOTTOM_BARS: ExemptList = {
  [`${C}assets/asset-register-table.tsx`]: { count: 1, kind: "phase 3", why: "the register's phone bulk-action bar", ruling: "2D D2, 2B R-q" },
  [`${C}layout/mobile-field-navigation.tsx`]: { count: 1, kind: "permanent", why: "the phone bottom navigation", ruling: "2D §5.3" },
  [`${C}ui/action-bar.tsx`]: { count: 1, kind: "permanent", why: "the phone ActionBar of the four detail pages", ruling: "2C K23" },
}

// Every EXEMPT list of this file by rule id (the meta-test and the phase 3 test read them), and the shared parts that own
// a rule's markup. A rule added later declares `const <NAME>: ExemptList = {` and joins EXEMPT_LISTS in the same commit.
const EXEMPT_LISTS: Readonly<Record<string, ExemptList>> = {
  GF1: LOCAL_FIELD,
  GF2: RAW_FIELDS,
  GF3: FIELD_CLASS_STRINGS,
  GF7: OLD_MARKUP,
  GB1: LOADER2,
  GD1: CLOSE_LABEL_IS_CANCEL,
  GD4: REVERSE,
  GL1: FIXED_BOTTOM_BARS,
  GL3: OLD_HELPERS,
}
const OWNERS: Readonly<Record<string, readonly string[]>> = {
  GF1: [`${C}ui/field.tsx`],
  GF2: [`${C}ui/input.tsx`, `${C}ui/native-select.tsx`, `${C}ui/textarea.tsx`],
  GF3: [`${C}ui/field-variants.ts`],
  GB1: [`${C}ui/button.tsx`, `${C}ui/search-field.tsx`],
}
const listProblems = (rule: string, counts: Readonly<Record<string, number>>) => exemptProblems(rule, counts, EXEMPT_LISTS[rule], OWNERS[rule])
```

  4. In the reader test, delete the line `  assert.deepEqual(budgetOverruns({ "src/a.tsx": 2, "src/b.tsx": 1 }, { "src/a.tsx": 2 }), ["src/b.tsx: 1 > 0"])`.
  5. GF1–GF3. Old:

```ts
test("GF1 no 2C file keeps its own Field component", () => {
  assertWithinBudget(countMatchesByFile(sources, /\bfunction Field\s*\(/g, notOwned), LOCAL_FIELD, "GF1 local function Field(")
})

test("GF2 hand-written inputs, selects and textareas do not grow", () => {
  assertWithinBudget(countByFile(sources, (file) => rawFieldTags(file.source).length, notOwned), RAW_FIELDS, "GF2 hand-written fields")
})

test("GF3 hand-written field class strings do not grow", () => {
  assertWithinBudget(countByFile(sources, (file) => classStringsWhere(file.source, isFieldClassString), notOwned), FIELD_CLASS_STRINGS, "GF3 field class strings")
})
```

  New:

```ts
test("GF1 no file keeps its own Field component", () => {
  assert.deepEqual(listProblems("GF1", countMatchesByFile(sources, /\bfunction Field\s*\(/g)), [])
})

test("GF2 hand-written inputs, selects and textareas stay in the shared fields and their EXEMPT rows", () => {
  assert.deepEqual(listProblems("GF2", countByFile(sources, (file) => rawFieldTags(file.source).length)), [])
})

test("GF3 hand-written field class strings stay in the shared field classes and their EXEMPT rows", () => {
  assert.deepEqual(listProblems("GF3", countByFile(sources, (file) => classStringsWhere(file.source, isFieldClassString))), [])
})
```

  6. GF4 (`:407`): `  for (const file of migratedSources()) {` directly above `    const vTrack = …` → `  for (const file of sources) {`.
  7. GF5. Old:

```ts
test("GF5 required, maxLength and minLength never disappear quietly (K4)", () => {
  const lost: string[] = []
  for (const [path, floor] of Object.entries(CONSTRAINT_FLOORS)) {
    const tags = findJsxTags(read(path), CONSTRAINT_TAGS)
    CONSTRAINT_ATTRS.forEach((attr, index) => {
      const count = tags.filter((tag) => hasJsxAttr(tag.text, attr)).length
      if (count < floor[index]) lost.push(`${path}: ${attr} ${count} < ${floor[index]}`)
    })
  }
  assert.deepEqual(lost, [], "Field only adds aria-required: keep required, maxLength and minLength on the control itself")
})
```

  New:

```ts
test("GF5 required, maxLength and minLength never disappear quietly (K4)", () => {
  const lost: string[] = []
  for (const file of sources) {
    const tags = findJsxTags(file.source, CONSTRAINT_TAGS)
    const live = CONSTRAINT_ATTRS.map((attr) => tags.filter((tag) => hasJsxAttr(tag.text, attr)).length)
    const floor = CONSTRAINT_FLOORS[file.path]
    if (!floor) {
      if (live.some((count) => count > 0)) lost.push(`${file.path}: [${live.join(", ")}] and no row; add it to CONSTRAINT_FLOORS`)
      continue
    }
    CONSTRAINT_ATTRS.forEach((attr, index) => {
      if (live[index] < floor[index]) lost.push(`${file.path}: ${attr} ${live[index]} < ${floor[index]}`)
    })
  }
  assert.deepEqual(lost, [], "Field only adds aria-required: keep required, maxLength and minLength on the control itself")
})
```

  8. GF6 (`:439`) and GF8 (`:453`): each `  for (const file of migratedSources()) {` → `  for (const file of sources) {` (after edits 6 and 8 the file has no `migratedSources`).
  9. GF7 and GB1. Old:

```ts
test("GF7 the old label, star, legend and checkbox markup does not grow", () => {
  assertWithinBudget(countMatchesByFile(sources, OLD_FIELD_MARKUP, notOwned), OLD_MARKUP, "GF7 old field markup")
})
```

```ts
test("GB1 hand-written spinners do not grow", () => {
  assertWithinBudget(countMatchesByFile(sources, /<Loader2\b/g, notOwned), LOADER2, "GB1 <Loader2")
})
```

  New:

```ts
test("GF7 the old label, star, legend and checkbox markup does not come back", () => {
  assert.deepEqual(listProblems("GF7", countMatchesByFile(sources, OLD_FIELD_MARKUP)), [])
})
```

```ts
test("GB1 hand-written spinners stay in the shared parts and their EXEMPT rows", () => {
  assert.deepEqual(listProblems("GB1", countMatchesByFile(sources, /<Loader2\b/g)), [])
})
```

  10. Four one-line calls (titles stay):
      - GD1: `  assertWithinBudget(countMatchesByFile(sources, CLOSE_IS_CANCEL), CLOSE_LABEL_IS_CANCEL, "GD1 closeLabel set to a cancel label")` → `  assert.deepEqual(listProblems("GD1", countMatchesByFile(sources, CLOSE_IS_CANCEL)), [])`
      - GD4: ``  assertWithinBudget(countMatchesByFile(sources, /\bflex-col-reverse\b/g, (path) => notOwned(path) && !path.startsWith(`${C}ui/`)), REVERSE, "GD4 flex-col-reverse")`` → `  assert.deepEqual(listProblems("GD4", countMatchesByFile(sources, /\bflex-col-reverse\b/g)), [])`
      - GL1: `  assertWithinBudget(countByFile(sources, (file) => classStringsWhere(file.source, fixedBottom), notOwned), FIXED_BOTTOM_BARS, "GL1 fixed bottom bars")` → `  assert.deepEqual(listProblems("GL1", countByFile(sources, (file) => classStringsWhere(file.source, fixedBottom))), [])`
      - GL3: `  assertWithinBudget(countMatchesByFile(sources, OLD_HELPER_MARKUP, notOwned), OLD_HELPERS, "GL3 old helpers")` → `  assert.deepEqual(listProblems("GL3", countMatchesByFile(sources, OLD_HELPER_MARKUP)), [])`
  11. GD2. Old:

```ts
test("GD2 migrated dialogs use the footer part, and the pending list holds only files still waiting", () => {
  const problems: string[] = []
  for (const file of sources) {
    if (file.path === `${C}ui/accessible-dialog.tsx`) continue
    const dialogs = findJsxTags(file.source, ["AccessibleDialog"]).length
    const footers = findJsxTags(file.source, ["AccessibleDialogFooter"]).length
    if (PENDING_FOOTER_PARTS.has(file.path)) {
      if (dialogs === 0) problems.push(`${file.path}: no AccessibleDialog left; remove it from PENDING_FOOTER_PARTS`)
      if (footers > 0) problems.push(`${file.path}: uses AccessibleDialogFooter now; remove it from PENDING_FOOTER_PARTS`)
    } else if (footers < dialogs) problems.push(`${file.path}: ${dialogs} AccessibleDialog, ${footers} AccessibleDialogFooter`)
  }
  for (const path of PENDING_FOOTER_PARTS) if (!read(path)) problems.push(`${path}: listed in PENDING_FOOTER_PARTS but not found`)
  assert.deepEqual(problems, [])
})
```

  New:

```ts
test("GD2 every dialog uses the footer part", () => {
  const problems: string[] = []
  for (const file of sources) {
    if (file.path === `${C}ui/accessible-dialog.tsx`) continue
    const dialogs = findJsxTags(file.source, ["AccessibleDialog"]).length
    const footers = findJsxTags(file.source, ["AccessibleDialogFooter"]).length
    if (footers < dialogs) problems.push(`${file.path}: ${dialogs} AccessibleDialog, ${footers} AccessibleDialogFooter`)
  }
  assert.deepEqual(problems, [])
})
```

  12. Check: `grep -n "MIGRATED_FILES\|BATCH_FILES\|NEW_2C_FILES\|notOwned\|migratedSources\|owned\b\|assertWithinBudget\|budgetOverruns\|PENDING_FOOTER_PARTS\|5ffee76" tests/form-migration-guards.test.ts` finds nothing.

- [ ] **Step 4: Guard edits.** None in VFG or LFG. `tests/helpers/source-files.ts` keeps `budgetOverruns` until Task 19 (FG-5): LFG calls it until Task 17 (LG-1).
- [ ] **Step 5: Verify.** `node --test tests/form-migration-guards.test.ts` (24 / 24); `npm test` (+1: the phase 3 test; the meta-test is replaced, not added; 2176 tests, 2175 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `tests/`). `node <tools>/eol.mjs tests/form-migration-guards.test.ts` prints `503 503`.
- [ ] **Step 6: Commit.** `git add tests/form-migration-guards.test.ts` then `git commit -m "test(guards): the form guards count over all of src with OWNERS and exact EXEMPT rows, and MIGRATED_FILES and BATCH_FILES go (2D-5 task 16, FG-4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

## Area LG: the list-frame guards and the list filters over all of src (Tasks 17–18)

Spec 2D §1 points 2 and 5, §3.5, §5.1–5.3, §5.5, M19 (2B I34) and the user's D1, D2, D13. Two test files change, plus one-line comment or message pins in three other test files and one comment in `c/ui/filter-panel.tsx`. No screen, message, API or database change; no `src` site moves. `D/` = `src/app/[locale]/(dashboard)/` · `P/` = `src/app/[locale]/(print)/` · `c/` = `src/components/`; line numbers are of `388d4d5`.

- **LG-1** locks `tests/list-frame-guards.test.ts` (LFG): every rule counts over all of `src`; `BUDGETS`, `KEEP`, `MIGRATED_LIST_FILES` and the tests L9 and L10 go; each rule gets an `OWNERS` list of files (§5.2) and an exact `EXEMPT` list (§5.1) checked by the shared `exemptProblems`; L0 checks the lists; a last test lists the phase 3 rows and their sum. `LOCAL_STAT_TILE` and `LOCAL_KEY_VALUE` stay zero-count rules with their history comments.
- **LG-2** widens items 5 and 6 of `tests/list-filters-ui.test.ts` from the 13 `MIGRATED_FILTER_FILES` to every `<form>` and every `FilterFormActions` in `src`, and deletes the list (M19, I34).
- **Interfaces:** LG-1 consumes `exemptProblems(rule, counts, exempt, owners?)`, `phase3Rows(lists)` and `type ExemptList` from `./helpers/guard-exempt.ts` (inline `type` specifier, as VG-1's Interfaces say) and stops importing `budgetOverruns`. LG-2 consumes only `tests/helpers/source-files.ts` as it is. Neither task exports anything.
- **Counts** are of `388d4d5`, taken with three read-only scripts in `<tools>/`, run from the repo root: `node <tools>/lg-verify.mts [RULE] [text]` (every LFG rule over all of `src` with no skip, each site with its line, and the 388d4d5 scope beside it), `node <tools>/lg-filters-verify.mts` and `node <tools>/lg-forms-content.mts` (every `<form>`, its role, action and submit, what it holds). If an earlier 2D-5 task edits a file of the inventory, run them again before Step 3 and use the live numbers.

### Inventory (live at `388d4d5`)

**LFG, rule by rule.** "Today" = LFG's scope at `388d4d5` (pages and components without the API, owners skipped); "all of src" adds `src/lib`, `src/app/api`, `src/i18n`, `src/types` and `src/proxy.ts`; "raw" also counts the owners.

| Rule | Today | All of src | Raw | Decision |
|---|---|---|---|---|
| LH1 `<h1>` | 4 in 4 | 4 in 4 | 5 in 5 | 4 `EXEMPT` rows (1 `phase 3`, 3 `permanent`); owner `c/ui/page-header.tsx` |
| LH2 old headers | 0 | 0 | 1 | owner `c/ui/page-header.tsx` |
| LB1 `<ArrowLeft` | 4 in 4 | 4 in 4 | 5 in 5 | 4 `EXEMPT` rows (`permanent`); owner `c/ui/page-header.tsx` |
| LP1 `pb-24` / `pb-36` | 0 (read `D/` only) | 0 | 0 | reads all of `src` now |
| LF1 local filter select | 0 | 0 | 1 | owner `c/ui/filter-select.tsx` (was: the whole `c/ui/` folder) |
| LT1 header fill | 0 | 0 | 0 | — |
| LT2 local sort header | 0 | 0 | 0 | owner `c/ui/data-table.tsx` kept |
| LT3 `<td colSpan>` | 0 | 0 | 1 | owner `c/ui/data-table.tsx` |
| LT4 hand pagination | 0 | 0 | 0 | owner `c/ui/pagination.tsx` kept |
| LT5 faded disabled | 0 | 0 | 0 | — |
| LV1 bare `toLocaleString()` | 0 | 0 | 0 | — (spec §5.3's "LV1 1, label data" reached 0 in 2D-3) |
| LV2 typed `"-"` | 29 in 10 | 57 in 23 | 57 in 23 | 23 `EXEMPT` rows, all `permanent` |
| LV3 `formatCurrency(` | 0 | 0 | 0 | — (deleted in 2D-4) |
| LS1 local tile function | 0 | 0 | 0 | no owner (was: the `c/ui/` folder; no shared part has one of the names) |
| LS2 `<MetricCard` | 0 | 0 | 0 | — |
| LK1 local label and value helper | 0 | 0 | 0 | no owner (as LS1) |
| LN1 `aria-current` "page" | 2 in 1 | 2 in 1 | 6 in 4; 7 in 5 with R-LG5 | 1 `EXEMPT` row (`permanent`); owners the 7 navigation primitives |
| LN2 shared names | 0 | 0 | 11 in 10 | owners the 10 `c/ui/` files that define them (was: the `c/ui/` folder) |
| LR1 row delete button | 0 | 0 | 0 | — |

Every counted site and what happens to it. None is fixed in this plan (2D-5 has no screen work, spec §3.5): each is an owner or a ruled exception.

| Rule | File | Lines | Decision | Why / ruling |
|---|---|---|---|---|
| LH1 | `src/app/[locale]/(auth)/login/page.tsx` | `:43` | EXEMPT `phase 3` | no shell; the title belongs to the login frame that phase 3 redoes (D2; R-LG3, open issue LG-c) |
| LH1 | `c/asset-operations/operation-document-print.tsx` | `:98` | EXEMPT `permanent` | the A4 document's own title (2D-4 R17) |
| LH1 | `c/assets/asset-label-print.tsx` | `:277` | EXEMPT `permanent` | the label print page (`(print)` group) has no shell (2B §9.4.3) |
| LH1 | `c/audit/audit-scan-header.tsx` | `:37` | EXEMPT `permanent` | the one-line field scan header (2B §9.4.3) |
| LH1, LH2, LB1 | `c/ui/page-header.tsx` | `:35`, `:29`, `:70` | OWNER | `PageHeader` and `PageBackLink` |
| LB1 | `c/admin/system-settings-form.tsx` | `:1413` | EXEMPT `permanent` | the arrow of the category transfer list's remove button (2B §9.4.3) |
| LB1 | `D/audit/rounds/[id]/page.tsx` | `:499` | EXEMPT `permanent` | the back item of the round's `ActionBar` (2C K23) |
| LB1 | `c/audit/audit-scan-header.tsx` | `:35` | EXEMPT `permanent` | the scan header's back link (2B §9.4.3) |
| LB1 | `c/disposal/disposal-batch-form.tsx` | `:97` | EXEMPT `permanent` | back to editing in the review step (2B §9.4.3) |
| LF1 | `c/ui/filter-select.tsx` | `:27` | OWNER | `function FilterSelect` |
| LT3 | `c/ui/data-table.tsx` | `:166` | OWNER | `TableEmptyRow` |
| LV2 | `D/asset-management/labels/page.tsx` | `:105`, `:124` ×2, `:131` | EXEMPT `permanent` | label data (2B R-n) |
| LV2 | `D/assets/[id]/page.tsx` | `:1202`, `:1204`, `:2390` ×2 | EXEMPT `permanent` | translated-sentence arguments (2B R-n) |
| LV2 | `P/asset-management/checkins/[id]/page.tsx` | `:164`, `:204` | EXEMPT `permanent` | print page (2B R-n) |
| LV2 | `P/asset-management/checkouts/[id]/page.tsx` | `:146`, `:147`, `:148`, `:184` | EXEMPT `permanent` | print page (2B R-n) |
| LV2 | `c/admin/system-settings-form.tsx` | `:2136` | EXEMPT `permanent` | the tag preview's default separator, not an empty value (2B R-n, kept so by 2D-2) |
| LV2 | `c/asset-operations/operation-document-print.tsx` | `:110` | EXEMPT `permanent` | an empty field on the A4 document (2D-4 R17) |
| LV2 | `c/asset-operations/void-document-banner.tsx` | `:21`, `:22`, `:23` | EXEMPT `permanent` | the banner prints on the A4 document (2D-4 R17) |
| LV2 | `c/assets/asset-label-batch-tool.tsx` | `:552`, `:564` ×2, `:569`, `:570`, `:571` | EXEMPT `permanent` | label data (2B R-n) |
| LV2 | `c/audit/audit-scan-check-form.tsx` | `:238`, `:245`, `:246` | EXEMPT `permanent` | translated-sentence arguments (2B R-n) |
| LV2 | `c/audit/audit-scan-offline-bar.tsx` | `:47` | EXEMPT `permanent` | translated sentence (2B R-n) |
| LV2 | `src/app/api/disposal-requests/bulk-decision/route.ts` | `:103` | EXEMPT `permanent` (new) | the API's stand-in tag of a request it cannot find (2B R-n; open issue LG-a) |
| LV2 | `src/lib/asset-cross-scope.ts` | `:212`–`:216` | EXEMPT `permanent` (new) | server-built summary rows; the dashboard, the reports page and the overview export show them (2B R-n; LG-a) |
| LV2 | `src/lib/asset-import-history.ts` | `:37`, `:42`, `:45` | EXEMPT `permanent` (new) | server-built import history, shown on import-export (2B R-n; LG-a) |
| LV2 | `src/lib/asset-operation-options.ts` | `:136` | EXEMPT `permanent` (new) | a legacy return candidate's custodian label, shown on the check-in page (2B R-n; LG-a) |
| LV2 | `src/lib/asset-tag.ts` | `:26` | EXEMPT `permanent` (new) | the separator's default, not an empty value (2B R-n) |
| LV2 | `src/lib/audit-correction-history.ts` | `:46` | EXEMPT `permanent` (new) | the user in the round page's correction sentence (2B R-n) |
| LV2 | `src/lib/audit-pdf.tsx` | `:218` | EXEMPT `permanent` (new) | an empty PDF cell (2B R-n) |
| LV2 | `src/lib/disposal-approval-service.ts` | `:123`, `:251` | EXEMPT `permanent` (new) | the stand-in tag of a request that cannot be found (2B R-n; LG-a) |
| LV2 | `src/lib/integration-auth.ts` | `:130` | EXEMPT `permanent` (new) | a server log line (2B R-n) |
| LV2 | `src/lib/ldap-sync.ts` | `:390`–`:392` | EXEMPT `permanent` (new) | parts of an English LDAP blocker message, listed in the settings page's sync preview (2B R-n; LG-a) |
| LV2 | `src/lib/production-readiness.ts` | `:120`, `:162`, `:283`, `:284`, `:340`, `:351` | EXEMPT `permanent` (new) | readiness values, shown on the readiness page (2B R-n; LG-a) |
| LV2 | `src/lib/system-log-presenter.ts` | `:134`, `:195` | EXEMPT `permanent` (new) | the log's user and record labels; `D/dashboard/page.tsx:513`–`:514` compare them with `"-"` (2B R-n; LG-a) |
| LV2 | `src/lib/system-setting-defaults.ts` | `:88` | EXEMPT `permanent` (new) | the default separator setting, not an empty value (2B R-n) |
| LN1 | `D/master-data/brands/page.tsx` | `:272`, `:295` | EXEMPT `permanent` | the brand picker is a vertical list (2B I11) |
| LN1 | `c/ui/tab-nav.tsx` `:54`, `c/ui/stat-strip.tsx` `:44`, `c/layout/mobile-field-navigation.tsx` `:62`, `:88`, and `c/ui/breadcrumbs.tsx` `:26` once R-LG5 counts the literal | 5 | OWNER | `NAV_PRIMITIVES`; `ui/pagination.tsx:63` sets `"true"`, `ui/steps.tsx:45` `"step"`, `layout/sidebar.tsx:404` a variable: owners with no count |
| LN2 | `c/ui/` `data-table.tsx` `:51`, `:163`; `empty-note.tsx` `:19`; `key-value-list.tsx` `:11`; `nil.tsx` `:8`; `page-header.tsx` `:29`; `pagination.tsx` `:47`; `row-actions.tsx` `:69`; `stat-strip.tsx` `:37`; `status-badge.tsx` `:9`; `tab-nav.tsx` `:43` | 11 | OWNER | each shared part defines its own name |

Totals after LG-1: 32 `EXEMPT` rows holding 67 sites (LH1 4, LB1 4, LV2 57, LN1 2); `phase 3` 1 row, 1 site; owners on 9 rules. Spec §5.3's "LV2 25" is 29 on pages and components today; the wider scope adds 28 in `src/lib` and one API route.

**Typed `"-"` that LV2 does not count** (its regex is `|| "-"`, `?? "-"`, `: "-"`; not changed, open issue LG-d): `return "-"` 8 times in 6 files: `D/asset-management/import-export/page.tsx:235` (`formatFileSize`, inside the source-file value), `src/lib/utils.ts:22`, `:32` (`formatDate`, `formatDateTime`: 34 `.tsx` files import them), `src/lib/asset-operation-document.ts:38` (`labelOrDash`), `src/lib/asset-operation-options.ts:174` (`getCheckoutDestinationLabel`), `src/lib/audit-finding-labels.ts:46`, `src/lib/system-log-presenter.ts:311`, `:338`; plus the default parameter `fallback = "-"` of `src/lib/asset-label-display.ts:7` (label data) and the two comparisons of `D/dashboard/page.tsx:513`–`:514`.

**List filters over all of src** (`lg-filters-verify.mts`, `lg-forms-content.mts`):

| What | Live | Decision |
|---|---|---|
| `<form>` elements (the JSX reader) | 55: 14 `role="search"`, 39 with `onSubmit` and no `role`, and 2 matches inside `{/* … */}` JSX comments with no closing tag (`c/admin/admin-user-form.tsx:125`, `c/master-data/asset-model-form.tsx:235`); 2 more `<form` in `//` comment lines are skipped by the reader (`c/ui/accessible-dialog.tsx:18`, `c/ui/sticky-form-footer.tsx:10`) | rule (a): a filter form is `role="search"` |
| search forms | GET (`action`, no `onSubmit`): `D/admin/logs/page.tsx:113`, `D/disposal/page.tsx:464`, `D/maintenance/page.tsx:199`, `D/master-data/{branches :165, brands :360, categories :201, companies :155, employees :175, locations :210, suppliers :249}/page.tsx`, `c/master-data/master-data-layout.tsx:21`, `c/reports/report-filter-panel.tsx:53`; client: `c/assets/asset-register-search-field.tsx:67` (`action` and `onSubmit`), `c/audit/audit-scan-search.tsx:42` (`onSubmit`) | rule (b): only hidden inputs stay raw inside; 43 hidden inputs, 0 other raw fields |
| forms that would be filter forms | every form with `action` and no `onSubmit`, and every form holding `FilterSelect` or `FilterFormActions`, is one of the 14 above; the 3 non-search forms holding a `SearchField` are data forms (`c/admin/system-settings-form.tsx:966`, `c/asset-operations/bulk-move-form.tsx:89`, `c/asset-operations/checkin-form.tsx:303`) | rule (a) does not read `SearchField` |
| `<FilterFormActions` | 11; 10 pass `clear`, each `clear={hasActiveFilters ? … : undefined}`; `D/admin/logs/page.tsx:121` has none | item 6 over all of `src`, 0 problems |
| old filter labels | 0 in all of `src` | rule (c) over all of `src` |
| local filter helpers | 1: `c/ui/filter-select.tsx:27` | LFG LF1's (owner); item 5 drops its own regex |
| filter parts outside a form | `FilterSelect` filtering on the client: `c/admin/asset-state-review-workspace.tsx:157`, `:163`, `:170`, `c/assets/asset-register-toolbar.tsx:44`, `:58`, `:72`, `c/assets/asset-register-filter-sheet.tsx:103`, `:114`, `:125`, `:139`, `:151`, `:163`, `:192`; in-page `SearchField`s: `c/admin/depreciation-policy-builder.tsx:372`, `c/admin/system-settings-form.tsx:2187`, `c/assets/asset-label-batch-tool.tsx:310` | already the shared parts; a raw field anywhere is FMG GF2's |
| server actions | `"use server"` 0, `formAction` 0 | rule (a)'s comment says so |

---

### Task 17 (LG-1): The list-frame guards count over all of src, with OWNERS and exact EXEMPT rows (`tests/list-frame-guards.test.ts`)

Spec §1 point 2, §5.1–5.3, §5.5, D1, D2, D13. Every counter loses its `allow` callback (`offScreen`, `skip(…)`, `skipUi`, the `D/` filter of LP1, the `NAV_PRIMITIVES` filter of LN1) and counts all of `src`; the shared parts it skipped become per-rule `OWNERS` (files, not the `c/ui/` folder). `BUDGETS` and `KEEP` become one `EXEMPT` list per rule in the §5.1 format: every `KEEP` row is a row with the same count, plus the 13 rows the wider scope adds. Each rule test is `assert.deepEqual(exemptProblems(id, COUNTERS[id](), EXEMPT[id] ?? {}, OWNERS[id] ?? []), [])`, which counts exactly both ways, so L9 and L10 go. `MIGRATED_LIST_FILES` goes (every rule covers every file). L0 checks the lists; the new last test pins the phase 3 rows and their sum. Stay: every regex and counter function (`LOCAL_STAT_TILE` and `LOCAL_KEY_VALUE` with their history comments), the 19 rule ids and their order, the names `HEADER_OWNER` and `NAV_PRIMITIVES`, the reader test's cases. One reader fix: `aria-current="page"` written as a literal counts (R-LG5). LV1–LV3 titles drop "on screen" (R-LG6).

**Files:**
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`)
- Pins (comments and messages that name the deleted `KEEP`): `tests/list-pages-ui.test.ts` (`i/lf w/crlf`), `tests/disposal-sweep-ui.test.ts` (`i/lf w/lf`), `tests/audit-scan-sweep-ui.test.ts` (`i/lf w/lf`)

**Interfaces:** consumes VG-1's `exemptProblems`, `phase3Rows` and `ExemptList`. Produces nothing another task imports.

**Changes at 388d4d5** (LFG regions, top to bottom; the file after this task is the listing at the end of the task, LF shown, 244 lines):

| Lines | Now | Becomes | Rule |
|---|---|---|---|
| `:4`–`:13` | the `source-files` import, `budgetOverruns,` at `:5` | the `guard-exempt` import before it (Step 1); `budgetOverruns,` deleted | D13 |
| `:15`–`:28` | the 2B header comment ("…phase 2D widens the guards to all of src and sets every budget to {}…"), `sources`, `D`, `C`, the `offScreen` comment and function, `skip`, `skipUi`, `NAV_PRIMITIVES`, `tagsWhere` | the 2D-5 header, `sources`, `D`, `P` (new, `"src/app/[locale]/(print)/"`), `C`, `tagsWhere` (listing `:15`–`:25`); `NAV_PRIMITIVES` moves to the owners block, same text | §1 points 2 and 5, R-LG1 |
| `:30`–`:132` | the comment "Files 2B is done with…", `MIGRATED_LIST_FILES` (99 paths) and the blank line after it | deleted | §5.5 |
| `:146` | `const HEADER_OWNER = …` | moves to the owners block, same text | §5.2 |
| `:176` | `const pageCurrent = (text: string) => /"page"/.test(jsxAttrValue(text, "aria-current") ?? "")` | a 2-line comment and the literal form (listing) | R-LG5 |
| `:178`–`:198` | `COUNTERS` with an `allow` callback on every line | the same counters with none (listing) | R-LG1 |
| `:211`–`:213` | `LV1: "numbers on screen go…"`, `LV2: "empty values on screen are…"`, `LV3: "money on screen goes…"` | `LV1: "numbers go…"`, `LV2: "empty values are…"`, `LV3: "money goes…"` (rest of each title unchanged) | R-LG6 |
| `:222`–`:327` | the `BUDGETS` comment and table, the `KEEP` comment and table | the owners block (`HEADER_OWNER`, `NAV_PRIMITIVES`, `OWNERS`) and `EXEMPT`, every row of the Inventory exactly (listing) | D1, §5.1–5.3, R-LG2–R-LG4 |
| `:336`, `:341`–`:343` | the reader test | Step 1 | R-LG5, R-LG1 |
| `:346`–`:356` | the rule loop with `budgetOverruns` and its "…Phase 2D sets every budget to {}." message | the `exemptProblems` loop, no message (the problems are the message) | D13 |
| `:358`–`:381` | L0 over `MIGRATED_LIST_FILES`, `BUDGETS` and `KEEP` | Step 1 | §5.5, R-LG7 |
| `:383`–`:402` | L9 with its 3-line comment, L10 with its 2-line comment | deleted (Step 3); the phase 3 test appended (Step 1) | D1, R-LG7 |

- [ ] **Step 1: The failing tests.** In `tests/list-frame-guards.test.ts` (CRLF; exact-string replacement with the Edit tool, never Write):
  - Add after `:3` (`import test from "node:test"`):

```ts
import { exemptProblems, phase3Rows, type ExemptList } from "./helpers/guard-exempt.ts"
```

  - Reader test, `:336`: after the line `  assert.equal(current(file('<Link aria-current={active ? "page" : undefined} /><li aria-current={on ? "step" : undefined} />')), 1)` add:

```ts
  assert.equal(current(file('<span aria-current="page">x</span><a aria-current={page} /><li aria-current="step" />')), 1, "a literal \"page\" counts; a variable named page and \"step\" do not")
```

  - Reader test, `:341`–`:343`: delete the three lines ``  assert.equal(offScreen("src/app/api/assets/route.ts"), true)``, ``  assert.equal(offScreen("src/lib/utils.ts"), true)`` and ``  assert.equal(offScreen(`${D}assets/page.tsx`), false)``. Nothing replaces them: the 13 `EXEMPT` rows of `src/lib` and the API pin the scope (a counter that skipped them would find each row at 0 and fail; dry-run mutation 3).
  - L0, `:358`–`:381`: the whole test `test("L0 a file 2B is done with keeps only what KEEP allows, and every row names a real file and a known guard", …)` → new:

```ts
test("L0 every rule has a title, a counter and an EXEMPT list, and every OWNERS and EXEMPT path is a real file", () => {
  const problems: string[] = []
  const ids = Object.keys(COUNTERS)
  if (Object.keys(TITLES).join() !== ids.join()) problems.push(`TITLES and COUNTERS name different rules: ${Object.keys(TITLES).join()} / ${ids.join()}`)
  if (Object.keys(EXEMPT).join() !== ids.join()) problems.push(`EXEMPT and COUNTERS name different rules: ${Object.keys(EXEMPT).join()} / ${ids.join()}`)
  for (const [id, owners] of Object.entries(OWNERS)) {
    if (!ids.includes(id)) problems.push(`OWNERS.${id}: no such rule`)
    for (const path of owners) if (!existsSync(path)) problems.push(`OWNERS.${id}: ${path} is no such file`)
  }
  for (const [id, rows] of Object.entries(EXEMPT)) {
    for (const path of Object.keys(rows)) if (!existsSync(path)) problems.push(`EXEMPT.${id}: ${path} is no such file, delete the row`)
  }
  assert.deepEqual(problems, [])
})
```

  - Append at the end of the file, after L10 (which Step 3 deletes), with one blank line before it:

```ts
// Spec 2D §5.1 (D1): the rows this file leaves to phase 3, and their sum. Phase 3 is D2's line (the register's bulk
// selection bar, the login page frame, the topbar search); here only the login page's title. Each guard file sums its
// own phase 3 rows: a test file that imports another one runs that file's tests a second time.
test("phase 3: every row the list-frame guards leave to phase 3, and their sum (spec 2D §5.1, D2)", () => {
  const rows = phase3Rows(EXEMPT)
  assert.deepEqual(
    rows.map(({ rule, file, count }) => `${rule} ${file}: ${count}`),
    ["LH1 src/app/[locale]/(auth)/login/page.tsx: 1"],
  )
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 1)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/list-frame-guards.test.ts` (24 tests). Expected to fail, 3: "the list-frame counters read JSX and lines as intended" (`a literal "page" counts; a variable named page and "step" do not`), "L0 every rule has a title, a counter and an EXEMPT list, and every OWNERS and EXEMPT path is a real file" and "phase 3: every row the list-frame guards leave to phase 3, and their sum (spec 2D §5.1, D2)" (both `ReferenceError: EXEMPT is not defined`). The 19 rule tests, L9 and L10 pass before; after Step 3 the 19 pass under the same names except LV1–LV3 (R-LG6). They are refactored, not loosened: every `KEEP` row is an `EXEMPT` row with the same count, and the new rows are the sites the wider scope adds.
- [ ] **Step 3: Implement** per the Changes table, region by region with the Edit tool, so the file equals the listing below (CRLF). Delete L9 and L10 with their comments (`:383`–`:402`). Run `node <tools>/lg-verify.mts LV2` (and the other rules) first if an earlier 2D-5 task touched a file of the Inventory, and use its numbers.
- [ ] **Step 4: Other pins.** Three strings name the deleted `KEEP`; exact old → new, each once in its file:
  - `tests/list-pages-ui.test.ts:69` (CRLF): `"the picker keeps aria-current=\"page\" on its two links (I11, LFG KEEP.LN1)"` → `"the picker keeps aria-current=\"page\" on its two links (I11, LFG EXEMPT.LN1)"`.
  - `tests/disposal-sweep-ui.test.ts:61` (LF): `"back to editing keeps its arrow (LFG KEEP.LB1)"` → `"back to editing keeps its arrow (LFG EXEMPT.LB1)"`.
  - `tests/audit-scan-sweep-ui.test.ts:159` (LF): `  // The failed line keeps its "-" inside a translated sentence (LFG LV2 KEEP 1, R-n).` → `  // The failed line keeps its "-" inside a translated sentence (LFG EXEMPT.LV2 1, R-n).`
  - No VFG or FMG row changes.
- [ ] **Step 5: Verify.** `node --test tests/list-frame-guards.test.ts tests/guard-exempt.test.ts tests/list-pages-ui.test.ts tests/disposal-sweep-ui.test.ts tests/audit-scan-sweep-ui.test.ts` (LFG 22 / 22, 0 fail); `npm test`: −1 test (LFG 23 → 22; 2176 → 2175 tests, 2174 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`); `node <tools>/eol.mjs tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts tests/disposal-sweep-ui.test.ts tests/audit-scan-sweep-ui.test.ts` prints `244 244`, `887 887`, `0 167`, `0 179` at `388d4d5` plus this task (a CRLF file the same number twice, an LF file 0 and its line count). `grep -n "const KEEP\|BUDGETS\|MIGRATED_LIST_FILES\|offScreen\|skipUi\|budgetOverruns" tests/list-frame-guards.test.ts` finds nothing.
- [ ] **Step 6: Commit.** `git add tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts tests/disposal-sweep-ui.test.ts tests/audit-scan-sweep-ui.test.ts` (the two LF files print "LF will be replaced by CRLF the next time Git touches it": expected, do not renormalize), then `git commit -m "test(guards): the list-frame guards count over all of src, with OWNERS and exact EXEMPT rows (2D-5 task 17, LG-1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

`tests/list-frame-guards.test.ts` after LG-1 (LF shown; the file is CRLF):

```ts
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import test from "node:test"
import { exemptProblems, phase3Rows, type ExemptList } from "./helpers/guard-exempt.ts"
import {
  countByFile,
  countMatchesByFile,
  findJsxTags,
  hasJsxAttr,
  jsxAttrValue,
  readSourceFiles,
  type SourceFile,
} from "./helpers/source-files.ts"

// List-frame guards (spec 2B §9.3, rulings I11, I14 and I15), locked by plan 2D-5 (spec 2D §5, D1, D13; the check is
// tests/helpers/guard-exempt.ts). Every rule counts over all of src, src/lib and the API routes included (spec 2D §1
// point 2). A file may hold a site only as an OWNER of the rule (the shared part that draws it, §5.2) or as a row of
// the rule's EXEMPT list (§5.1): its exact count, why it stays, the ruling that keeps it and its kind, "permanent" or
// "phase 3" (D2; the last test lists those). The commit that moves a site lowers its row, or deletes it at 0. A new
// site uses the shared part; a new row needs a spec ruling.
const sources = readSourceFiles("src")
const D = "src/app/[locale]/(dashboard)/"
const P = "src/app/[locale]/(print)/"
const C = "src/components/"
const tagsWhere = (names: string[], keep: (text: string) => boolean) => (file: SourceFile) => findJsxTags(file.source, names).filter((tag) => keep(tag.text)).length

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

const OLD_HEADER = /\bMasterDataHeader\b|\bReportHeader\b|\bfunction PageHeader\b/g
const BACK_ICON = /<ArrowLeft\b/g
const DOUBLE_BOTTOM_PADDING = /\bpb-(?:24|36)\b/g
const LOCAL_FILTER_SELECT = /\bfunction (?:FilterSelect|ReportSelect|LabeledSelect)\b|\bfunction Filter\(/g
const HEADER_LOOK = /\bbg-(?:muted|accent)(?![\w/-])|\buppercase\b/ // the /NN fills belong to VFG R7
const LOCAL_SORT_HEADER = /\bfunction (?:[A-Z]\w*)?Sort\w*Header\b/g
const BARE_LOCALE_STRING = /\.toLocaleString\(\)/g
const RAW_DASH = /(?:\|\||\?\?|:)\s*"-"/g
const FORMAT_CURRENCY = /(?<!function )\bformatCurrency\(/g
// Plan 2D-3 (D19) added each name below its own tile's last commit: EvidenceStat (the evidence drawer), SummaryItem
// (the batch form and the import panel).
// Plan 2D-4 Task 22 (AP-3): ImpactItem (the round cancel dialog).
// Plan 2D-4 Task 23 (AP-4): PreviewMetric (the round form preview).
// Plan 2D-4 Task 38 (DS-9): SummaryValue (the bulk disposal execution result).
const LOCAL_STAT_TILE = /\bfunction (?:SummaryTile|SummaryCard|SummaryPill|SummaryStrip|RoleAuditCard|ResolutionMetric|CoverageMetric|Metric|DashboardCard|BatchMetric|MetricCard|OperationMetric|EvidenceStat|SummaryItem|ImpactItem|PreviewMetric|SummaryValue)\b/g
const METRIC_CARD_TAG = /<MetricCard(?=[\s/>])/g
// Spec 2D D19: label and value look-alikes join this list in the commit that removes them, so the count stays 0:
// MovementInfo (the movement timeline, plan 2D-3), ReviewItem (the component manager), MobileField (my assets),
// DocumentFact (a supplier's purchase documents).
// Plan 2D-4 Task 6 (OP-6): ReadOnly (the check-in form's current custody).
// Plan 2D-4 Task 24 (AP-5): ReviewPreviewField (the finding review dialog).
// Plan 2D-4 Task 26 (AP-7): FindingComparison (the findings phone card).
// Plan 2D-4 Task 27 (AP-8): MobileAuditField (the audit rounds phone card).
// Plan 2D-4 Task 29 (AP-10): PendingInfo (the audit pending phone card).
// Plan 2D-4 Task 38 (DS-9): ReviewValue (the bulk disposal execution review).
// Plan 2D-4 Task 39 (DS-10): MobileDisposalField (the disposal queue's phone card).
const LOCAL_KEY_VALUE = /\bfunction (?:Info|InfoRow|DetailItem|BatchInfo|MobileAuditDetailField|MovementInfo|ReviewItem|MobileField|DocumentFact|ReadOnly|ReviewPreviewField|FindingComparison|MobileAuditField|PendingInfo|ReviewValue|MobileDisposalField)\b/g
const UI_NAME = /\bfunction (?:StatusBadge|MetricCard|ColumnHeader|PageHeader|Pagination|DataTable|TabNav|StatStrip|KeyValueList|RowActions|TableEmptyRow|EmptyNote|Nil)\b/g
const ROW_DELETE_BUTTON = /<[A-Z]\w*DeleteButton\s+id=/g
// aria-current="page" written as a literal, or "page" inside an expression ({active ? "page" : undefined}). A variable
// named page, "step" and "true" do not count.
const pageCurrent = (text: string) => /\saria-current=(["'])page\1/.test(text) || /"page"/.test(jsxAttrValue(text, "aria-current") ?? "")

const COUNTERS: Record<string, () => Record<string, number>> = {
  LH1: () => countByFile(sources, tagsWhere(["h1"], () => true)),
  LH2: () => countMatchesByFile(sources, OLD_HEADER),
  LB1: () => countMatchesByFile(sources, BACK_ICON),
  LP1: () => countMatchesByFile(sources, DOUBLE_BOTTOM_PADDING),
  LF1: () => countMatchesByFile(sources, LOCAL_FILTER_SELECT),
  LT1: () => countByFile(sources, tagsWhere(["thead", "th"], (text) => HEADER_LOOK.test(text))),
  LT2: () => countMatchesByFile(sources, LOCAL_SORT_HEADER),
  LT3: () => countByFile(sources, (file) => findJsxTags(file.source, ["td"]).filter((tag) => hasJsxAttr(tag.text, "colSpan")).length),
  LT4: () => countByFile(sources, handPaginations),
  LT5: () => countByFile(sources, (file) => file.source.split("\n").filter(fadedDisabled).length),
  LV1: () => countMatchesByFile(sources, BARE_LOCALE_STRING),
  LV2: () => countMatchesByFile(sources, RAW_DASH),
  LV3: () => countMatchesByFile(sources, FORMAT_CURRENCY),
  LS1: () => countMatchesByFile(sources, LOCAL_STAT_TILE),
  LS2: () => countMatchesByFile(sources, METRIC_CARD_TAG),
  LK1: () => countMatchesByFile(sources, LOCAL_KEY_VALUE),
  LN1: () => countByFile(sources, tagsWhere(["[A-Za-z][\\w.]*"], pageCurrent)),
  LN2: () => countMatchesByFile(sources, UI_NAME),
  LR1: () => countMatchesByFile(sources, ROW_DELETE_BUTTON),
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
  LV1: "numbers go through formatCount or formatMoney, not a bare toLocaleString()",
  LV2: "empty values are Nil or orNil, not a typed \"-\"",
  LV3: "money goes through formatMoney, not formatCurrency",
  LS1: "number tiles come from StatStrip, not a local tile function",
  LS2: "MetricCard gives way to StatStrip",
  LK1: "detail values come from KeyValueList, not a local Info or DetailItem helper",
  LN1: "aria-current=\"page\" is set by TabNav, StatStrip, Pagination and the menus, not by hand",
  LN2: "no local function takes the name of a shared component",
  LR1: "delete buttons in table rows move into the ⋯ menu of RowActions",
}

// ---- Owners (spec 2D §5.2): the shared parts that draw what their rule forbids everywhere else. An owner may count
// anything and is never an EXEMPT row. A rule without an entry has no owner.
const HEADER_OWNER = `${C}ui/page-header.tsx`
const NAV_PRIMITIVES = ["ui/tab-nav.tsx", "ui/breadcrumbs.tsx", "ui/pagination.tsx", "ui/steps.tsx", "ui/stat-strip.tsx", "layout/sidebar.tsx", "layout/mobile-field-navigation.tsx"].map((path) => C + path)
const OWNERS: Readonly<Record<string, readonly string[]>> = {
  LH1: [HEADER_OWNER], // PageHeader's title
  LH2: [HEADER_OWNER], // function PageHeader itself
  LB1: [HEADER_OWNER], // PageBackLink's arrow
  LF1: [`${C}ui/filter-select.tsx`], // function FilterSelect itself
  LT2: [`${C}ui/data-table.tsx`], // DataTableHead, the sortable header
  LT3: [`${C}ui/data-table.tsx`], // TableEmptyRow's <td colSpan>
  LT4: [`${C}ui/pagination.tsx`], // the shared pager
  LN1: NAV_PRIMITIVES, // the navigation primitives set aria-current themselves
  // Each shared part defines its own name: DataTable and TableEmptyRow, EmptyNote, KeyValueList, Nil, PageHeader,
  // Pagination, RowActions, StatStrip, StatusBadge, TabNav.
  LN2: ["data-table", "empty-note", "key-value-list", "nil", "page-header", "pagination", "row-actions", "stat-strip", "status-badge", "tab-nav"].map((name) => `${C}ui/${name}.tsx`),
}

// ---- What stays (spec 2D §5.1, §5.3), one list per rule, in the order of COUNTERS; {} means nothing stays. Rulings:
// "2D D2" is the phase 3 line; "2B R-n" (print pages, label data, translated sentences, src/lib and the API keep "-"),
// "2B I11" and "2B §9.4.3" (the KEEP table of phase 2B) are spec 2B's; "2C K23" is the ActionBar; "2D-4 R17" print.
const EXEMPT: Readonly<Record<string, ExemptList>> = {
  LH1: {
    "src/app/[locale]/(auth)/login/page.tsx": { count: 1, kind: "phase 3", why: "the login page has no shell; its title belongs to the login frame that phase 3 redoes", ruling: "2D D2" },
    [`${C}asset-operations/operation-document-print.tsx`]: { count: 1, kind: "permanent", why: "the A4 document's own title, printed on the paper", ruling: "2D-4 R17" },
    [`${C}assets/asset-label-print.tsx`]: { count: 1, kind: "permanent", why: "the label print page has no shell: its own title above the label preview", ruling: "2B §9.4.3" },
    [`${C}audit/audit-scan-header.tsx`]: { count: 1, kind: "permanent", why: "the field scan header, its own one-line variant", ruling: "2B §9.4.3" },
  },
  LH2: {},
  LB1: {
    [`${C}admin/system-settings-form.tsx`]: { count: 1, kind: "permanent", why: "the arrow of the category transfer list's remove button, not a page back", ruling: "2B §9.4.3" },
    [`${D}audit/rounds/[id]/page.tsx`]: { count: 1, kind: "permanent", why: "the back item of the round's ActionBar", ruling: "2C K23" },
    [`${C}audit/audit-scan-header.tsx`]: { count: 1, kind: "permanent", why: "the field scan header's back link, its own one-line variant", ruling: "2B §9.4.3" },
    [`${C}disposal/disposal-batch-form.tsx`]: { count: 1, kind: "permanent", why: "back to editing in the review step, not a page back", ruling: "2B §9.4.3" },
  },
  LP1: {},
  LF1: {},
  LT1: {},
  LT2: {},
  LT3: {},
  LT4: {},
  LT5: {},
  LV1: {},
  LV2: {
    // Pages and components: print pages, label data and translated sentences.
    [`${D}asset-management/labels/page.tsx`]: { count: 4, kind: "permanent", why: "label data: the category, state and location the label prints", ruling: "2B R-n" },
    [`${D}assets/[id]/page.tsx`]: { count: 4, kind: "permanent", why: "translated-sentence arguments: the parent's tag in the two relationship summaries and the from and to values of the history sentence", ruling: "2B R-n" },
    [`${P}asset-management/checkins/[id]/page.tsx`]: { count: 2, kind: "permanent", why: "print page: the A4 check-in document", ruling: "2B R-n" },
    [`${P}asset-management/checkouts/[id]/page.tsx`]: { count: 4, kind: "permanent", why: "print page: the A4 check-out document", ruling: "2B R-n" },
    [`${C}admin/system-settings-form.tsx`]: { count: 1, kind: "permanent", why: "the default separator of the asset tag preview, not an empty value", ruling: "2B R-n" },
    [`${C}asset-operations/operation-document-print.tsx`]: { count: 1, kind: "permanent", why: "an empty field on the A4 document", ruling: "2D-4 R17" },
    [`${C}asset-operations/void-document-banner.tsx`]: { count: 3, kind: "permanent", why: "the void banner prints on the A4 document", ruling: "2D-4 R17" },
    [`${C}assets/asset-label-batch-tool.tsx`]: { count: 6, kind: "permanent", why: "label data: the category, state, company, branch and location the label prints", ruling: "2B R-n" },
    [`${C}audit/audit-scan-check-form.tsx`]: { count: 3, kind: "permanent", why: "translated-sentence arguments: the checker's name and the check time", ruling: "2B R-n" },
    [`${C}audit/audit-scan-offline-bar.tsx`]: { count: 1, kind: "permanent", why: "the sync error inside a translated sentence", ruling: "2B R-n" },
    // src/lib and the API, counted since plan 2D-5: server-built text, logs, the PDF and settings defaults.
    "src/app/api/disposal-requests/bulk-decision/route.ts": { count: 1, kind: "permanent", why: "the API's stand-in asset tag for a request it cannot find", ruling: "2B R-n" },
    "src/lib/asset-cross-scope.ts": { count: 5, kind: "permanent", why: "server-built summary rows: the custodian, its company and branch, the home location and its branch", ruling: "2B R-n" },
    "src/lib/asset-import-history.ts": { count: 3, kind: "permanent", why: "server-built import history: the batch id, the file name and the approver", ruling: "2B R-n" },
    "src/lib/asset-operation-options.ts": { count: 1, kind: "permanent", why: "the custodian label of a legacy return candidate, built on the server", ruling: "2B R-n" },
    "src/lib/asset-tag.ts": { count: 1, kind: "permanent", why: "the asset tag separator's default, not an empty value", ruling: "2B R-n" },
    "src/lib/audit-correction-history.ts": { count: 1, kind: "permanent", why: "the correction's user name, an argument of a translated sentence", ruling: "2B R-n" },
    "src/lib/audit-pdf.tsx": { count: 1, kind: "permanent", why: "an empty cell of the audit PDF", ruling: "2B R-n" },
    "src/lib/disposal-approval-service.ts": { count: 2, kind: "permanent", why: "the stand-in asset tag of a request that cannot be found", ruling: "2B R-n" },
    "src/lib/integration-auth.ts": { count: 1, kind: "permanent", why: "a server log line", ruling: "2B R-n" },
    "src/lib/ldap-sync.ts": { count: 3, kind: "permanent", why: "the parts of an English LDAP sync blocker message", ruling: "2B R-n" },
    "src/lib/production-readiness.ts": { count: 6, kind: "permanent", why: "readiness check values, server-built text such as the two auth URLs in one line", ruling: "2B R-n" },
    "src/lib/system-log-presenter.ts": { count: 2, kind: "permanent", why: "the system log's user and record labels; the dashboard reads the \"-\" user as the system user", ruling: "2B R-n" },
    "src/lib/system-setting-defaults.ts": { count: 1, kind: "permanent", why: "the default asset tag separator setting, not an empty value", ruling: "2B R-n" },
  },
  LV3: {},
  LS1: {},
  LS2: {},
  LK1: {},
  LN1: {
    [`${D}master-data/brands/page.tsx`]: { count: 2, kind: "permanent", why: "the brand picker is a vertical list of links, where aria-current=\"page\" is right", ruling: "2B I11" },
  },
  LN2: {},
  LR1: {},
}

test("the list-frame counters read JSX and lines as intended", () => {
  const file = (source: string): SourceFile => ({ path: "src/components/x.tsx", source })
  assert.equal(tagsWhere(["h1"], () => true)(file('// <h1>old</h1>\n<h1 className="x">a</h1>')), 1)
  assert.equal(handPaginations(file("function APagination() {\n  return <Pagination page={1} />\n}\nfunction BPagination() {\n  return <nav />\n}")), 1)
  assert.equal(fadedDisabled('className="pointer-events-none opacity-50"'), true)
  assert.equal(fadedDisabled('className="disabled:pointer-events-none disabled:opacity-50"'), false)
  const current = tagsWhere(["[A-Za-z][\\w.]*"], pageCurrent)
  assert.equal(current(file('<Link aria-current={active ? "page" : undefined} /><li aria-current={on ? "step" : undefined} />')), 1)
  assert.equal(current(file('<span aria-current="page">x</span><a aria-current={page} /><li aria-current="step" />')), 1, "a literal \"page\" counts; a variable named page and \"step\" do not")
  assert.equal(tagsWhere(["thead", "th"], (text) => HEADER_LOOK.test(text))(file('<thead className="bg-muted/40"><th className="uppercase">')), 1)
  assert.deepEqual(countMatchesByFile([file('{a || "-"} {b ?? "-"} {c ? d : "-"} {"a-b"} "x-y"')], RAW_DASH), { "src/components/x.tsx": 3 })
  assert.deepEqual(countMatchesByFile([file("export function formatCurrency(value) {}\nformatCurrency(1)")], FORMAT_CURRENCY), { "src/components/x.tsx": 1 })
  assert.deepEqual(countMatchesByFile([file('<BranchDeleteButton id={row.id} /><DeleteButtonGroup id="x" />')], ROW_DELETE_BUTTON), { "src/components/x.tsx": 1 })
})

for (const [id, title] of Object.entries(TITLES)) {
  test(`${id} ${title}`, () => {
    assert.deepEqual(exemptProblems(id, COUNTERS[id](), EXEMPT[id] ?? {}, OWNERS[id] ?? []), [])
  })
}

test("L0 every rule has a title, a counter and an EXEMPT list, and every OWNERS and EXEMPT path is a real file", () => {
  const problems: string[] = []
  const ids = Object.keys(COUNTERS)
  if (Object.keys(TITLES).join() !== ids.join()) problems.push(`TITLES and COUNTERS name different rules: ${Object.keys(TITLES).join()} / ${ids.join()}`)
  if (Object.keys(EXEMPT).join() !== ids.join()) problems.push(`EXEMPT and COUNTERS name different rules: ${Object.keys(EXEMPT).join()} / ${ids.join()}`)
  for (const [id, owners] of Object.entries(OWNERS)) {
    if (!ids.includes(id)) problems.push(`OWNERS.${id}: no such rule`)
    for (const path of owners) if (!existsSync(path)) problems.push(`OWNERS.${id}: ${path} is no such file`)
  }
  for (const [id, rows] of Object.entries(EXEMPT)) {
    for (const path of Object.keys(rows)) if (!existsSync(path)) problems.push(`EXEMPT.${id}: ${path} is no such file, delete the row`)
  }
  assert.deepEqual(problems, [])
})

// Spec 2D §5.1 (D1): the rows this file leaves to phase 3, and their sum. Phase 3 is D2's line (the register's bulk
// selection bar, the login page frame, the topbar search); here only the login page's title. Each guard file sums its
// own phase 3 rows: a test file that imports another one runs that file's tests a second time.
test("phase 3: every row the list-frame guards leave to phase 3, and their sum (spec 2D §5.1, D2)", () => {
  const rows = phase3Rows(EXEMPT)
  assert.deepEqual(
    rows.map(({ rule, file, count }) => `${rule} ${file}: ${count}`),
    ["LH1 src/app/[locale]/(auth)/login/page.tsx: 1"],
  )
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 1)
})
```

---

### Task 18 (LG-2): The list filter rules cover every form in src, and MIGRATED_FILTER_FILES goes (`tests/list-filters-ui.test.ts`, `c/ui/filter-panel.tsx`)

Spec §3.5, M19, 2B I34 (its gap closes), §1 point 5. Items 5 and 6 read every source file instead of the 13 `MIGRATED_FILTER_FILES`, through the shared JSX reader (comment lines skipped, multi-line tags read whole). Item 5 becomes three rules over all of `src`: (a) a filter form, one that sends its fields to a URL (`action`, no `onSubmit`) or holds `FilterSelect` or `FilterFormActions`, is `role="search"` (the old "every form is a search landmark", which only made sense inside the 13 list files); (b) a `role="search"` form holds the shared fields only (`Field` + `SearchField`, `FilterSelect`) and hidden inputs; (c) no old filter label class string anywhere. Its local-helper line goes: LFG LF1 counts the same names (and `LabeledSelect`) over all of `src` since LG-1, with `c/ui/filter-select.tsx` as its owner. A raw field outside a search form is FMG GF2's (all of `src` after Task 16 (FG-4)). Item 6 reads every `FilterFormActions` that passes `clear` with the JSX reader instead of a `[\s\S]*?\/>` regex. Each rule is a function that the test also feeds small fixtures, so the rules are shown to bite although `src` has no violation. Stay: the item 2, 7 and 8 tests, the report filter test and the header comment, byte for byte. The stale "phase 2D moves" comment of the shared filter actions goes.

**Files:**
- Modify: `tests/list-filters-ui.test.ts` (`i/lf w/crlf`), `src/components/ui/filter-panel.tsx` (`i/lf w/crlf`, comment only; item 2 of the same test reads this file)

**Changes at 388d4d5:**

| File, line | Now | Becomes | Rule |
|---|---|---|---|
| test `:1`–`:3` | three imports | the `source-files` import after `:3` (Step 1) | — |
| test `:21`–`:37` | the items 5 and 6 comment ("…has no guard until 2D (I34)") and `MIGRATED_FILTER_FILES` (13 paths) | the comment, `sources`, `OLD_FILTER_LABEL`, `filterFormProblems` and `clearFilterProblems` (block below) | M19, I34, §5.5 |
| test `:39`–`:49` | `test("migrated filter forms use Field, SearchField and FilterSelect only, and every form is a search landmark (item 5)", …)` | Step 1 | M19 |
| test `:51`–`:57` | `test("clear filters shows only while a filter is on (item 6)", …)` | Step 1 | M19 |
| filter-panel `:38` | `// one row with 40px fields, and phase 2D moves the default size to 36px. items-end lines them up with the bottom of` | `// one row with 40px fields, and the default size is 36px from md. items-end lines them up with the bottom of` | §1 point 5 |

The rules (replace test `:21`–`:37`):

```ts
// Items 5 and 6 (spec 2B §6.13 table B, I34) over all of src since plan 2D-5 (spec 2D §3.5, M19). A filter form sends
// its fields to a URL (an action and no onSubmit; this app has no server-action form, which would need its own
// exception here) or holds FilterSelect or FilterFormActions, and it is a search landmark. A search form holds the
// shared fields only (Field + SearchField, FilterSelect) and hidden inputs. A raw field outside a search form is FMG
// GF2's; a local filter helper is LFG LF1's.
const sources = readSourceFiles("src")
const OLD_FILTER_LABEL = /space-y-1 text-sm font-medium text-foreground|mb-1\.5 block text-xs font-medium text-muted-foreground/g

function filterFormProblems(files: readonly SourceFile[]) {
  const problems: string[] = []
  let searchForms = 0
  for (const file of files) {
    for (const form of findJsxElements(file.source, "form")) {
      const where = `${file.path}:${form.line}`
      const search = jsxAttrValue(form.text, "role") === "search"
      if (!search) {
        const toUrl = hasJsxAttr(form.text, "action") && !hasJsxAttr(form.text, "onSubmit")
        const filterParts = findJsxTags(form.children ?? "", ["FilterSelect", "FilterFormActions"]).length > 0
        if (toUrl || filterParts) problems.push(`${where}: a filter form needs role="search"`)
        continue
      }
      searchForms++
      if (form.children === null) problems.push(`${where}: no closing </form>`)
      for (const tag of findJsxTags(form.children ?? "", ["input", "select", "textarea"])) {
        if (tag.name !== "input" || jsxAttrValue(tag.text, "type") !== "hidden") problems.push(`${where}: a raw <${tag.name}> (use Field + SearchField or FilterSelect; only hidden inputs stay raw)`)
      }
    }
  }
  return { problems, searchForms }
}

// Item 6: every FilterFormActions that offers clear filters offers it only while a filter is on.
function clearFilterProblems(files: readonly SourceFile[]) {
  const problems: string[] = []
  let clears = 0
  for (const file of files) {
    for (const tag of findJsxTags(file.source, ["FilterFormActions"])) {
      const clear = jsxAttrValue(tag.text, "clear")
      if (clear === null) continue
      clears++
      if (!/^hasActiveFilters \?/.test(clear.trim())) problems.push(`${file.path}:${tag.line}: clear={${clear}}`)
    }
  }
  return { problems, clears }
}
```

- [ ] **Step 1: The failing tests.** In `tests/list-filters-ui.test.ts` (CRLF; Edit tool):
  - Add after `:3` (`import test from "node:test"`):

```ts
import { findJsxElements, findJsxTags, findMatches, hasJsxAttr, jsxAttrValue, readSourceFiles, type SourceFile } from "./helpers/source-files.ts"
```

  - Item 5, `:39`–`:49`: the whole test `test("migrated filter forms use Field, SearchField and FilterSelect only, and every form is a search landmark (item 5)", …)` → new:

```ts
test("filter forms across src are search landmarks and hold Field, SearchField and FilterSelect only (item 5, I34)", () => {
  const fixture = (source: string): SourceFile => ({ path: "src/x.tsx", source })
  assert.equal(filterFormProblems([fixture('<form action={basePath}><SearchField name="q" /></form>')]).problems.length, 1, "a GET form without role=\"search\"")
  assert.equal(filterFormProblems([fixture('<form onSubmit={apply}><FilterSelect name="s" /></form>')]).problems.length, 1, "a client filter form without role=\"search\"")
  assert.equal(filterFormProblems([fixture('<form role="search" action={basePath}><input type="hidden" name="p" value="1" /><select name="s" /><input name="q" /></form>')]).problems.length, 2, "a raw select and a raw input in a search form")
  assert.deepEqual(filterFormProblems([fixture('<form onSubmit={save}><input name="q" /><SearchField /></form><form role="search" onSubmit={go}><SearchField /></form>')]).problems, [], "a data form with a search box is not a filter form, and SearchField is shared")
  const { problems, searchForms } = filterFormProblems(sources)
  assert.deepEqual(problems, [])
  assert.ok(searchForms > 10, `expected the list pages' search forms, found ${searchForms}`)
  assert.deepEqual(findMatches(sources, OLD_FILTER_LABEL), [], "an old filter label")
})
```

  - Item 6, `:51`–`:57`: the whole test `test("clear filters shows only while a filter is on (item 6)", …)` → new:

```ts
test("clear filters shows only while a filter is on, on every FilterFormActions in src (item 6)", () => {
  const fixture = (source: string): SourceFile => ({ path: "src/x.tsx", source })
  assert.equal(clearFilterProblems([fixture('<FilterFormActions submitLabel="a" clear={{ href: "/x", label: "b" }} /><FilterFormActions submitLabel="a" />')]).problems.length, 1)
  const { problems, clears } = clearFilterProblems(sources)
  assert.deepEqual(problems, [])
  assert.ok(clears > 5, `expected the list pages' clear links, found ${clears}`)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/list-filters-ui.test.ts` (6 tests). Expected to fail, 2: "filter forms across src are search landmarks and hold Field, SearchField and FilterSelect only (item 5, I34)" (`ReferenceError: filterFormProblems is not defined`) and "clear filters shows only while a filter is on, on every FilterFormActions in src (item 6)" (`ReferenceError: clearFilterProblems is not defined`). The other four pass before and after.
- [ ] **Step 3: Implement.** Replace test `:21`–`:37` with the rules block (`MIGRATED_FILTER_FILES` and its comment go). Edit the `c/ui/filter-panel.tsx:38` comment per the table (exact-string replacement; no code change).
- [ ] **Step 4: Guard rows.** None (no VFG, FMG or LFG row changes).
- [ ] **Step 5: Verify.** `node --test tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts tests/list-primitives-ui.test.ts` (list filters 6 / 6); `npm test`: +0 tests (2175 tests, 2174 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`); `node <tools>/eol.mjs tests/list-filters-ui.test.ts src/components/ui/filter-panel.tsx` prints `132 132` and `51 51`. `grep -n "MIGRATED_FILTER_FILES" -r tests src` finds nothing.
- [ ] **Step 6: Commit.** `git add tests/list-filters-ui.test.ts src/components/ui/filter-panel.tsx` then `git commit -m "test(filters): the list filter rules cover every form in src, and MIGRATED_FILTER_FILES goes (2D-5 task 18, LG-2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

## Area FG, last task: budgetOverruns goes (Task 19)

Task 19 is the last FG task. It runs here, after Task 17 (LG-1), because until then LFG still imports `budgetOverruns` (R9).

### Task 19 (FG-5): Delete budgetOverruns once no guard calls it (`tests/helpers/source-files.ts`)

Spec §5.5 and D13 (one shared check for the three guard files). After FG-4 (FMG), LG-1 (LFG) and VG-2 (VFG's own `assertWithinBudget`) no test calls `budgetOverruns` (`git grep -n "budgetOverruns\|assertWithinBudget" -- tests scripts src` → only `tests/helpers/source-files.ts`; run it first and stop if anything else shows). The function and its comment go; three comments of the helper that still speak of "ratchet guards" and budgets name the EXEMPT check instead. `countMatchesByFile`'s and `countByFile`'s `allow` parameters stay (`tests/ui-overlay-guards.test.ts` and others pass one).

**Files:**
- Modify: `tests/helpers/source-files.ts` (`i/lf w/crlf`)
- Test: `tests/dead-code-cleanup.test.ts` (`i/lf w/lf`)

**Changes at 388d4d5:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:25` | `// Matches per file, for ratchet guards whose budget is "at most N in this file". Files with no match are left out.` | `// Matches per file, for the guards that hold each file to its EXEMPT row (tests/helpers/guard-exempt.ts). Files with no` / `// match are left out.` (two lines) | D13 |
| `:38` | `… add the case to the reader test in that file; never raise a budget.` | `… add the case to the reader test in that file; never add an EXEMPT row.` | D13 |
| `:194` | `// Counts per file from a counting function, for ratchet guards. Files counted as 0 are left out.` | `// Counts per file from a counting function, for the EXEMPT checks. Files counted as 0 are left out.` | D13 |
| `:204`–`:210` | the blank line, `// "path: count > budget" …` and `export function budgetOverruns(…) { … }` | deleted (the file ends with `countByFile`'s `}`) | D13 |

- [ ] **Step 1: The failing test.** Append to `tests/dead-code-cleanup.test.ts` (LF):

```ts

// Plan 2D-5 (spec 2D §5.5, D13): the three guard files share one EXEMPT check, so the budget check they used is gone.
test("the old budget check is gone, and the three guard files use the shared EXEMPT check (spec 2D §5.5, D13)", () => {
  assert.doesNotMatch(read("tests/helpers/source-files.ts"), /\bbudgetOverruns\b|\bbudget\b|\bratchet\b/)
  for (const path of ["tests/visual-foundation-guards.test.ts", "tests/form-migration-guards.test.ts", "tests/list-frame-guards.test.ts"]) {
    const source = read(path)
    assert.doesNotMatch(source, /\bbudgetOverruns\b|\bassertWithinBudget\b/, path)
    assert.match(source, /import \{[^}]*\bexemptProblems\b[^}]*\} from "\.\/helpers\/guard-exempt\.ts"/, path)
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/dead-code-cleanup.test.ts`. Expected to fail: "the old budget check is gone, and the three guard files use the shared EXEMPT check (spec 2D §5.5, D13)" (the helper still holds `budgetOverruns`); the other 7 pass. If it fails on a guard file instead, VG-2 or LG-1 has not landed: stop.
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard edits.** None.
- [ ] **Step 5: Verify.** `node --test tests/dead-code-cleanup.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/guard-exempt.test.ts` (all pass); `npm test` (+1: 2176 tests, 2175 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning). `node <tools>/eol.mjs tests/helpers/source-files.ts tests/dead-code-cleanup.test.ts` prints `204 204` and `0 103` (with FG-2 in).
- [ ] **Step 6: Commit.** `git add tests/helpers/source-files.ts tests/dead-code-cleanup.test.ts` then `git commit -m "test(guards): delete budgetOverruns, which no guard calls after the EXEMPT lock (2D-5 task 19, FG-5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

## Area NG: the five new guards (Tasks 20–27)

Spec 2D §1 item 2 ("guard ใหม่ 5 ตัว"), §3.5, §5.1–§5.4, D1, D2, D13, D14. Three code tasks (with Task 13, FG-1, for the findings banner) move every site the new guards would fail, then five guard tasks add one rule each to `tests/visual-foundation-guards.test.ts` (VFG), budget-free, with an exact `EXEMPT` list (§5.1) and, where a shared part draws the thing itself, `OWNERS` (§5.2), checked by the shared `exemptProblems`:

| Rule | Spec §5.4 | What it counts over all of `src` | After this area |
|---|---|---|---|
| N1 | item 1 | Tailwind palette colors, `white`/`black` utilities, color values in a class or a style object | 8 `EXEMPT` rows, 74 sites, all `permanent` (paper, camera imagery, the preview stage, the bell's dot) |
| N2 | item 2 | `border`/`divide`/`outline` `-dashed`/`-dotted` | `OWNERS` `FileDropzone`, `SignaturePad`; `EXEMPT` `{}` |
| N3 | item 3 | raw `<button>` JSX tags | `OWNERS` 4 `c/ui` parts (7 sites); 17 `EXEMPT` rows, 24 sites, 1 `phase 3` (the topbar search clear) |
| N4 | item 4 | `opacity-*` behind any variant that holds `disabled` | `EXEMPT` `{}` |
| N5 | item 5 | height, min-height, max-height or size at `sm:` on a button or a button-like link | `EXEMPT` `{}` |

- **Order:** Task 20 (NG-1) first (it creates `tests/guard-lock-sweep-ui.test.ts`), Tasks 21 and 22 in any order, then Tasks 23 to 27 in this order (each guard goes after the previous one, and its line after the previous line of `EXEMPT_LISTS`).
- **Interfaces:** consumes `exemptProblems(rule, counts, exempt, owners?)`, `phase3Rows(lists)` and `type ExemptList` (VG-1), VFG's `sources`, `read`, `existsSync`, the `EXEMPT_LISTS` registry and the phase 3 test (VG-2), and `countByFile`, `countMatchesByFile`, `findJsxTags`, `findJsxElements`, `hasJsxAttr` from `tests/helpers/source-files.ts` (unchanged). Produces nothing another task imports. For the docs area: the rule ids `N1`–`N5` (keys of `EXEMPT_LISTS` and the `rule` of `exemptProblems`), the test titles below, VFG's phase 3 total after NG-8 (2 sites: R2 `c/assets/asset-register-table.tsx`, N3 `c/layout/global-search.tsx`).
- **Tests:** `tests/guard-lock-sweep-ui.test.ts` (LF, new) takes one test per code task (Tasks 20–22); each guard task adds one test to VFG. +8 tests in all. Existing pin edited: `tests/scanner-text-input.test.ts:197` (Task 20).
- **Counts** are of `388d4d5` with the guards' own regexes and readers: `<tools>/ng-final.mts` (run `node <tools>/ng-final.mts --sites` with the repo root as cwd: it imports the repo's `tests/helpers/source-files.ts` and only reads `src`). Live and `git archive 388d4d5` agree: N1 76 in 9 files, N2 2 in 2, N3 33 in 22, N4 3 in 2, N5 1 in 1.

### Inventory (live at `388d4d5`)

**N1 raw colors** (76 in 9 files):

| File | Sites | Decision | Why |
|---|---|---|---|
| `c/asset-operations/operation-document-print.tsx` | 19: `:46` `print:bg-white`; `:92` `border-slate-300`, `bg-white`, `text-slate-950`; `:93` `text-red-600/10` (void watermark); `:96`–`:99`, `:105`, `:106`, `:108`–`:110`, `:120`, `:121`, `:127`, `:128` (slate ink and lines) | EXEMPT permanent | the A4 paper (spec §5.3 print pages, 2D-4 R17) |
| `c/assets/asset-label-print.tsx` | 12: `:113` `print:bg-white`; `:284` `bg-white`, `text-slate-950`; `:330`, `:331`, `:333`, `:334`, `:341` `text-black`; `:336`, `:352` `border-slate-300`, `bg-white` | EXEMPT permanent | the label print page: black on white at physical size (§5.3, 2A §9.5) |
| `c/asset-operations/signature-pad.tsx` | 1: `:123` `bg-white` | EXEMPT permanent | the signature canvas is paper and prints (2D-4 R17) |
| `c/audit/audit-scan-camera.tsx` | 12: `:154` `border-white/50`, `bg-slate-950/70`; `:165` `bg-white`, `text-slate-950`, `text-white`, `hover:bg-white/15`; `:181`, `:190` `border-white/50`, `bg-slate-950/70`, `text-white` | EXEMPT permanent | zoom, torch and stop on the camera image (§5.3, 2D-4 R17) |
| `c/audit/audit-scan-panels.tsx` | 5: `:161` the `style` shadow `rgba(15, 23, 42, 0.42)`; `:163`–`:166` `border-white` | EXEMPT permanent | the QR frame on the camera image (2D-4 R17) |
| `c/ui/scanner-text-input.tsx` | 23: `:359` ×2; `:373` ×4; `:392` `text-white` (the lit torch); `:393` ×4; `:427`, `:443` the `style` shadows; `:429`–`:432`, `:445`, `:446`, `:448`, `:449` `border-white`; `:447` `bg-white/85`, `shadow-[0_0_8px_rgba(255,255,255,0.7)]` | 22 EXEMPT permanent; `:392` **fix** (NG-1) | the zoom and torch controls and both scan frames sit on the camera image; the lit torch is `bg-warning`, whose ink is `text-warning-foreground` (white), allowed in `c/ui` |
| `c/layout/mobile-field-navigation.tsx` | 1: `:72` `text-white` on `bg-primary` (the round scan button) | **fix** (NG-2) | `text-primary-foreground` is the token (#FFFFFF), as `Button`'s `default` variant |
| `c/layout/topbar.tsx` | 1: `:183` `text-white` on `bg-danger` (the bell's unread count) | EXEMPT permanent (open issue NG-a) | `text-danger-foreground` may only appear in `c/ui` (`tests/ui-overlay-guards.test.ts:20`–`:25`); VFG pins the string (`:296`, 2A §9.8 #11) |
| `c/ui/attachment-preview-dialog.tsx` | 2: `:45` `bg-black` (the stage behind a photo), `:50` `bg-white` (under a PDF page) | EXEMPT permanent (open issue NG-b) | media imagery and paper, not the app's surfaces (NG-R2) |

Not counted, by the rule's definition (not class names, NG-R2): the `#FFFFFF` page metadata `src/app/layout.tsx:48` and the manifest colors `src/app/manifest.ts:12`, `:13` (browser chrome takes literals); the print CSS `#ffffff` / `#000000` of `operation-document-print.tsx:55` and `asset-label-print.tsx:123`, `:129`, `:160`; the canvas strokes `signature-pad.tsx:45`, `:46`, `:105`; the PDF styles of `src/lib/audit-pdf.tsx` (9 hex at `:23`–`:76`). The one color value inside a class is the serial frame's glow (`scanner-text-input.tsx:447`, counted above).

**N2 dashed and dotted lines** (2 in 2 files): `c/ui/file-dropzone.tsx:123` and `c/asset-operations/signature-pad.tsx:123` (`border-dashed`) — OWNERS: the drop target and the signing area are those parts' job. 2A's allowed list (`07-feedback.md:331`) also named the asset page's tree lines, `audit-scan-room-picker` and `maintenance-attachments`: 0 left (2D-3 and 2D-4 removed them). No `-dotted`, `divide-dashed` or `outline-dashed` anywhere.

**N3 raw `<button>`** (33 in 22 files; `findJsxTags(source, ["button"])`, comment lines skipped; `Button` renders `"button"` through `Comp` and the Radix triggers live inside `c/ui` parts, so neither counts):

| File | Sites | Decision | Why / ruling |
|---|---|---|---|
| `c/ui/row-actions.tsx` | 3: `:131` the next-step button, `:184` a sheet menu item, `:274` the sheet delete | OWNER | `RowActions` is that control |
| `c/ui/searchable-select.tsx` | 2: `:85` the combobox trigger (field look), `:126` its clear | OWNER | the field part |
| `c/ui/search-field.tsx` | 1: `:37` the clear button | OWNER | 2D-4 R5 named it |
| `c/ui/segmented.tsx` | 1: `:50` the options | OWNER | the toggle part |
| `c/ui/scanner-text-input.tsx` | 3: `:316` the camera toggle (`buttonVariants` outline `lg`, beside the field); `:364` zoom, `:383` torch (on the camera image) | `:316` **fix** (NG-1, `Button`); `:364`, `:383` EXEMPT permanent | a command beside a field is a `Button`; camera controls are imagery, EXEMPT not OWNER (VG-R5), as the audit camera's (2D-4 R5) |
| `c/ui/data-freshness-banner.tsx` | 1: `:67` the fresh-state refresh | moved by Task 13 (FG-1) | spec §5.5 GB3 |
| `c/assets/asset-attachments.tsx` | 3: `:182`, `:338`, `:377` | EXEMPT permanent | the photo is the control (2D-3 R5) |
| `c/assets/asset-component-manager.tsx` | 1: `:462` | EXEMPT permanent | a pressed two-line candidate row (2D-3 R5) |
| `c/assets/asset-label-batch-tool.tsx` | 2: `:327`, `:450` | EXEMPT permanent | two-line result and recent rows that add to the print list (2D-3 R5) |
| `c/assets/asset-state-help-popover.tsx` | 1: `:24` | EXEMPT permanent; 44px hit area below `md` (Task 1, CF-1) | the 24px help circle in a label row or a table head (2D-3 R5; the user, 2026-10-16) |
| `c/assets/asset-thumbnail.tsx` | 1: `:63` | EXEMPT permanent | the image is the control (2D-3 R5) |
| `c/audit/audit-scan-camera.tsx` | 3: `:156`, `:175`, `:186` | EXEMPT permanent | zoom, torch, stop on the camera image (2D-4 R5) |
| `c/audit/audit-scan-lookup-card.tsx` | 1: `:74` | EXEMPT permanent | a two-line register match (2D-4 R5) |
| `c/audit/audit-scan-room-list.tsx` | 1: `:107` | EXEMPT permanent | the whole row opens the check sheet (2D-4 R5) |
| `c/audit/audit-scan-room-picker.tsx` | 2: `:50`, `:118` | EXEMPT permanent | the trigger under `SheetTrigger asChild`, the pressed option (2D-4 R5) |
| `c/audit/audit-scan-search.tsx` | 1: `:146` | EXEMPT permanent | the whole result row (2D-4 R5) |
| `c/disposal/disposal-asset-picker.tsx` | 1: `:70` | EXEMPT permanent | a listbox option with its own check box (2D-4 R5) |
| `c/maintenance/maintenance-attachments.tsx` | 1: `:147` | EXEMPT permanent | the image or PDF preview is the control (2D-4 R5) |
| `c/layout/sidebar.tsx` | 1: `:365` | EXEMPT permanent | the group row, a navigation row (2D-2 R11) |
| `c/layout/mobile-field-navigation.tsx` | 1: `:85` | EXEMPT permanent | the bottom bar's "More", a navigation item (2D-2 R11) |
| `c/layout/global-search.tsx` | 1: `:152` | EXEMPT **phase 3** | the topbar search's clear; the file is phase 3 (D2, 2D-2 R10) |
| `c/auth/login-form.tsx` | 1: `:101` the show-password toggle | EXEMPT permanent (open issue NG-c); its `sm:` sizes move (NG-3) | a control inside the password field's box, as `SearchField`'s clear; 2C plan 4 Task 8 kept it |

**N4 disabled fades** (3 in 2 files): `c/ui/scanner-text-input.tsx:372` (zoom), `:390` (torch) → **fix** (NG-1); `c/ui/data-freshness-banner.tsx:71` → Task 13 (FG-1).

**N5 heights at `sm:` on buttons** (1 in 1 file): `c/auth/login-form.tsx:111` `sm:min-h-10` (with `sm:min-w-10`) on the show-password toggle → **fix** (NG-3: `md:`, the field's breakpoint). Not buttons, not counted: the login logo `src/app/[locale]/(auth)/login/page.tsx:41` `sm:h-[72px]` (an `Image`), the audit QR frame `c/audit/audit-scan-panels.tsx:160` `sm:max-h-80`. No hand-written button-shaped link is left (a scan of `Link` / `a` tags with a border and a 32–44px height or a primary fill and no `buttonVariants` finds 3 near misses, all link cards or `FilterChipList`'s chips: `D/master-data/suppliers/[id]/page.tsx:291`, `c/reports/reports-operations-view.tsx:222`, `c/ui/filter-chips.tsx:30`).

---

### Task 20 (NG-1): The scanner input's camera toggle is an outline `lg` Button, and its controls on the camera image never fade when disabled (`c/ui/scanner-text-input.tsx`)

Spec §5.4 items 1, 3 and 4, §5.3; DESIGN.md Buttons ("Build them with `Button` / `buttonVariants` …", "Disabled: never faded with opacity"). The camera toggle beside the text field is a hand-styled `<button>` with `cn(buttonVariants({ variant: "outline", size: "lg" }), …)`: it becomes `Button` with the same variant, size, classes and props (`type="button"` is `Button`'s default), so it looks and behaves the same. The zoom and torch controls on the camera image stay raw buttons with their own dark fill and white ink (as the audit camera's, 2D-4 R5, R17), lose `disabled:opacity-60` as the audit camera's controls have none (NG-R5), and get one comment for the EXEMPT rows; the lit torch takes `text-warning-foreground` (white, the warning variant's ink). One comment above the two scan frames says why they keep their own colors. Stays: the toggle's children (spinner or camera icon, then the label), every scanner behaviour, both overlays, the two shadows (VFG R2), the `<Loader2` lines (Task 15, FG-3, gave the two in buttons `motion-reduce:animate-none`).

**Files:**
- Modify: `src/components/ui/scanner-text-input.tsx` (`i/lf w/crlf`)
- Create: `tests/guard-lock-sweep-ui.test.ts` (LF, new)
- Test (edit): `tests/scanner-text-input.test.ts` (`i/lf w/crlf`)

**Changes at 388d4d5:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:6` | `import { buttonVariants } from "@/components/ui/button-variants"` | `import { Button } from "@/components/ui/button"` | §5.4 item 3 |
| `:10` | `import { cn } from "@/lib/utils"` | deleted (`:320` was the file's only `cn(`) | — |
| `:316`–`:322` | `<button` `type="button"` `disabled={disabled}` `onClick={handleToggleScanner}` `className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}` `title={…}` `>` | `<Button` `variant="outline"` `size="lg"` `disabled={disabled}` `onClick={handleToggleScanner}` `className="w-full sm:w-auto"` `title={…}` `>`, one prop per line in this order (the test pins it) | §5.4 item 3 |
| `:325` | `</button>` (after the toggle's label `<span>`) | `</Button>` | — |
| above `:358` `{scanMode === "asset-qr" && scannerRunning && zoomAvailable ? (` | — | a two-line JSX comment: `{/* The zoom and torch controls sit on the camera image: raw buttons with their own dark fill and white ink, as` / `    the audit camera's (spec 2D §5.3, permanent; plan 2D-5 lists them). */}` | §5.3 |
| `:372` | zoom class `… focus-visible:ring-offset-2 disabled:opacity-60 ${` | `… focus-visible:ring-offset-2 ${` | §5.4 item 4 |
| `:390` | torch class `… focus-visible:ring-offset-2 disabled:opacity-60 ${` | `… focus-visible:ring-offset-2 ${` | §5.4 item 4 |
| `:392` | `"border-warning bg-warning text-white hover:bg-warning-hover"` | `"border-warning bg-warning text-warning-foreground hover:bg-warning-hover"` | §5.4 item 1 |
| above `:422` `function QrScannerOverlay() {` | — | `// The two scan frames keep their own dim surround and white corners: they sit on the camera image (spec 2D §5.3, permanent).` | §5.3 |

- [ ] **Step 1: The failing test.** Create `tests/guard-lock-sweep-ui.test.ts` (LF) with exactly:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-5 (spec 2D §5.4, D14): the code sites that the five new guards of tests/visual-foundation-guards.test.ts
// (N1–N5) would fail, each moved in its own commit before the guard that locks it. Each test pins one file and fails
// before that commit. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("scanner input: the camera toggle is an outline lg Button, and the controls on the camera image never fade when disabled (spec 2D §5.4 items 1, 3, 4)", () => {
  const source = read("src/components/ui/scanner-text-input.tsx")
  assert.match(source, /import \{ Button \} from "@\/components\/ui\/button"/)
  assert.match(source, /<Button\s+variant="outline"\s+size="lg"\s+disabled=\{disabled\}\s+onClick=\{handleToggleScanner\}\s+className="w-full sm:w-auto"\s+title=\{scannerRunning \|\| scannerLoading \? labels\.stop : labels\.start\}\s*>/)
  assert.match(source, /<span>\{scannerRunning \|\| scannerLoading \? labels\.stop : labels\.start\}<\/span>\s*<\/Button>/)
  // The lit torch is the warning fill with its own foreground token, the look of Button's warning variant.
  assert.match(source, /"border-warning bg-warning text-warning-foreground hover:bg-warning-hover"/)
  assert.doesNotMatch(source, /buttonVariants|from "@\/lib\/utils"|disabled:opacity/)
  // The zoom and torch controls sit on the camera image and stay raw buttons, with a comment (as the audit camera's).
  assert.equal(source.match(/<button\b/g)?.length, 2)
  assert.match(source, /\{\/\* The zoom and torch controls sit on the camera image: raw buttons[\s\S]*?\*\/\}\n\s+\{scanMode === "asset-qr" && scannerRunning && zoomAvailable \? \(/)
})
```

  Existing pin, `tests/scanner-text-input.test.ts:197`:
  - old: `  assert.match(source, /className=\{cn\(buttonVariants\(\{ variant: "outline", size: "lg" \}\), "w-full sm:w-auto"\)\}/)`
  - new: `  assert.match(source, /<Button\s+variant="outline"\s+size="lg"[\s\S]*?className="w-full sm:w-auto"/)`
- [ ] **Step 2: Watch it fail.** `node --test tests/guard-lock-sweep-ui.test.ts tests/scanner-text-input.test.ts`. Expected to fail: "scanner input: the camera toggle is an outline lg Button, and the controls on the camera image never fade when disabled (spec 2D §5.4 items 1, 3, 4)" and "scanner input keeps mobile controls labelled, touch-safe, and unambiguous".
- [ ] **Step 3: Implement** per the Changes table. The exact old → new texts (CRLF file: exact-string replacement keeps its endings):

  1. `:6`. Old `import { buttonVariants } from "@/components/ui/button-variants"` → new `import { Button } from "@/components/ui/button"`.
  2. `:10`. Delete the line `import { cn } from "@/lib/utils"`.
  3. `:316`–`:322`. Old:

```ts
        <button
          type="button"
          disabled={disabled}
          onClick={handleToggleScanner}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
          title={scannerRunning || scannerLoading ? labels.stop : labels.start}
        >
```

  New:

```ts
        <Button
          variant="outline"
          size="lg"
          disabled={disabled}
          onClick={handleToggleScanner}
          className="w-full sm:w-auto"
          title={scannerRunning || scannerLoading ? labels.stop : labels.start}
        >
```

  4. `:324`–`:325`. Old:

```ts
          <span>{scannerRunning || scannerLoading ? labels.stop : labels.start}</span>
        </button>
```

  New:

```ts
          <span>{scannerRunning || scannerLoading ? labels.stop : labels.start}</span>
        </Button>
```

  5. `:358`. Old `            {scanMode === "asset-qr" && scannerRunning && zoomAvailable ? (` (keep its 12-space indent). New:

```ts
            {/* The zoom and torch controls sit on the camera image: raw buttons with their own dark fill and white ink, as
                the audit camera's (spec 2D §5.3, permanent; plan 2D-5 lists them). */}
            {scanMode === "asset-qr" && scannerRunning && zoomAvailable ? (
```

  6. `:372`. Old `rounded px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 ${` → new `rounded px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${`.
  7. `:390`. Old `px-3 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 ${` → new `px-3 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${`.
  8. `:392`. Old `"border-warning bg-warning text-white hover:bg-warning-hover"` → new `"border-warning bg-warning text-warning-foreground hover:bg-warning-hover"`.
  9. `:422`. Old `function QrScannerOverlay() {`. New:

```ts
// The two scan frames keep their own dim surround and white corners: they sit on the camera image (spec 2D §5.3, permanent).
function QrScannerOverlay() {
```

- [ ] **Step 4: Guard edits.** None. VFG R2 keeps `c/ui/scanner-text-input.tsx` 2 (the shadows stay); this file's N1 (22), N3 (2) and N4 (0) counts are what NG-6, NG-8 and NG-9 write.
- [ ] **Step 5: Verify.** `node --test tests/guard-lock-sweep-ui.test.ts tests/scanner-text-input.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`; `npm test` (+1 test: 2177 tests, 2176 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`). `node <tools>/eol.mjs src/components/ui/scanner-text-input.tsx tests/scanner-text-input.test.ts tests/guard-lock-sweep-ui.test.ts` prints `474 474`, `215 215`, `0 21`.
- [ ] **Step 6: Commit.** `git add src/components/ui/scanner-text-input.tsx tests/scanner-text-input.test.ts tests/guard-lock-sweep-ui.test.ts` (the new LF file prints "LF will be replaced by CRLF the next time Git touches it": expected, do not renormalize), then `git commit -m "refactor(ui): the scanner input's camera toggle is an outline lg Button, and its controls on the camera image never fade when disabled (2D-5 task 20, NG-1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 21 (NG-2): The bottom bar's round scan button takes the primary foreground token (`c/layout/mobile-field-navigation.tsx`)

Spec §5.4 item 1. The emphasized scan destination draws a white icon on `bg-primary` with raw `text-white`; the token for ink on the primary fill is `text-primary-foreground` (#FFFFFF, `Button`'s `default` variant), so nothing changes on screen. Stays: `shadow-md` (VFG R2, kept since phase 1), the 48px circle, the label line, the "More" raw button (2D-2 R11, N3 row).

**Files:**
- Modify: `src/components/layout/mobile-field-navigation.tsx` (`i/lf w/crlf`)
- Test: `tests/guard-lock-sweep-ui.test.ts` (LF)

**Changes at 388d4d5:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:72` | `destination.emphasized && "h-12 w-12 rounded-full bg-primary text-white shadow-md",` | `destination.emphasized && "h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-md",` | §5.4 item 1 |

- [ ] **Step 1: The failing test.** Append to `tests/guard-lock-sweep-ui.test.ts`:

```ts

test("bottom bar: the round scan button's icon takes the primary foreground token, not raw white (spec 2D §5.4 item 1)", () => {
  const source = read("src/components/layout/mobile-field-navigation.tsx")
  assert.match(source, /destination\.emphasized && "h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-md"/)
  assert.doesNotMatch(source, /\btext-white\b/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/guard-lock-sweep-ui.test.ts`. Expected to fail: "bottom bar: the round scan button's icon takes the primary foreground token, not raw white (spec 2D §5.4 item 1)".
- [ ] **Step 3: Implement** the one row (exact string replacement).
- [ ] **Step 4: Guard edits.** None (VFG R2 and LFG LN1 rows of this file are unchanged).
- [ ] **Step 5: Verify.** `node --test tests/guard-lock-sweep-ui.test.ts tests/mobile-field-navigation-ui.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts`; `npm test` (+1: 2178 tests, 2177 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint`. `node <tools>/eol.mjs src/components/layout/mobile-field-navigation.tsx tests/guard-lock-sweep-ui.test.ts` prints `104 104`, `0 27`.
- [ ] **Step 6: Commit.** `git add src/components/layout/mobile-field-navigation.tsx tests/guard-lock-sweep-ui.test.ts` then `git commit -m "refactor(ui): the bottom bar's round scan button takes the primary foreground token instead of raw white (2D-5 task 21, NG-2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 22 (NG-3): The login show-password toggle changes size at `md` with its field (`c/auth/login-form.tsx`)

Spec §5.4 item 5, D3 (every size switches at `md`); 2C plan 4 Task 8 kept the toggle as it is and noted that its `sm:min-h-10 sm:min-w-10` switch at `sm` while the field switches at `md`, so between 640 and 767px it was 40px wide beside a 44px field. It becomes `md:min-h-10 md:min-w-10`: 44 × 44px below `md`, 40 × 40px from `md`, the field's own steps (`inset-y-0` still stretches it to the field's height). It stays a raw button (N3 row, NG-R4): a control inside the password field's box whose height follows the field (`inset-y-0`, `rounded-r-md` on the field's edge), which `Button`'s fixed sizes cannot do; its `aria-pressed`, `aria-controls`, `onPointerDown` and focus return stay. Stays: every attribute, the `pr-12` of the field, the login page frame (phase 3, D2).

**Files:**
- Modify: `src/components/auth/login-form.tsx` (`i/lf w/crlf`)
- Test: `tests/guard-lock-sweep-ui.test.ts` (LF)

**Changes at 388d4d5:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:111` | `… focus-visible:ring-inset focus-visible:ring-ring sm:min-h-10 sm:min-w-10"` | `… focus-visible:ring-inset focus-visible:ring-ring md:min-h-10 md:min-w-10"` | §5.4 item 5 |

- [ ] **Step 1: The failing test.** Append to `tests/guard-lock-sweep-ui.test.ts`:

```ts

test("login: the show-password toggle changes size at md with its field, never at sm (spec 2D §5.4 item 5)", () => {
  const source = read("src/components/auth/login-form.tsx")
  // Full field height through inset-y-0; 44 × 44px below md and 40 × 40px from md, as the 40px field (2C plan 4 Task 8).
  assert.match(source, /className="absolute inset-y-0 right-0 inline-flex min-h-11 min-w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-10 md:min-w-10"/)
  assert.doesNotMatch(source, /(?<![\w-])sm:(?:h|min-h|max-h|size|w|min-w)-/)
  // It stays the one raw button: a control inside the password field's box, as SearchField's clear button.
  assert.equal(source.match(/<button\b/g)?.length, 1)
})
```

  No existing assertion changes (`tests/login-form-ui.test.ts:63` pins the raw `<button` right after the field, which stays).
- [ ] **Step 2: Watch it fail.** `node --test tests/guard-lock-sweep-ui.test.ts tests/login-form-ui.test.ts`. Expected to fail: "login: the show-password toggle changes size at md with its field, never at sm (spec 2D §5.4 item 5)".
- [ ] **Step 3: Implement.** Old `focus-visible:ring-inset focus-visible:ring-ring sm:min-h-10 sm:min-w-10"` → new `focus-visible:ring-inset focus-visible:ring-ring md:min-h-10 md:min-w-10"`.
- [ ] **Step 4: Guard edits.** None (FMG `CONSTRAINT_FLOORS` `login-form` [2, 0, 0] holds).
- [ ] **Step 5: Verify.** `node --test tests/guard-lock-sweep-ui.test.ts tests/login-form-ui.test.ts tests/permission-aware-navigation.test.ts tests/form-migration-guards.test.ts`; `npm test` (+1: 2179 tests, 2178 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint`. `node <tools>/eol.mjs src/components/auth/login-form.tsx tests/guard-lock-sweep-ui.test.ts` prints `134 134`, `0 36`.
- [ ] **Step 6: Commit.** `git add src/components/auth/login-form.tsx tests/guard-lock-sweep-ui.test.ts` then `git commit -m "fix(ui): the login show-password toggle changes size at md with its field, not at sm (2D-5 task 22, NG-3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

The five guard tasks edit `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`) only, at the three places VG-2 set up for later rules (VG-2 **Interfaces**): a new rule goes directly above the comment line that begins `// Every EXEMPT list of this file, by rule`, its list joins `EXEMPT_LISTS` as the last line before that object's `}`, and a `phase 3` row joins the phase 3 test. Each Step 1 inserts the rule's test (it fails with a `ReferenceError` until Step 3), each Step 3 inserts the regex, the reader, `OWNERS` and `EXEMPT` above that test and the `EXEMPT_LISTS` line. Line numbers "when the task runs" assume VG-2, VG-3 and the earlier NG tasks as written (without VG-3 they sit 3–4 lines higher); find each anchor by its text. A rule reads all of `src` (VFG's `sources`), comments included, like VFG's other regex rules: a comment in `src` never names a raw class.

### Task 23 (NG-6): N1, colors come from the tokens outside the paper and the camera imagery (`tests/visual-foundation-guards.test.ts`)

Spec §5.4 item 1, §5.3 ("สีดิบ (ใหม่) หน้าพิมพ์ · ภาพกล้อง permanent"), 2D-4 R17, D1, D14. One regex over all of `src` (NG-R2): a Tailwind palette class, a `white`/`black` utility, a color value in an arbitrary class value, or a color literal in a `style={{ … }}` object, behind any variants. Eight `EXEMPT` rows, all `permanent`, 74 sites: the A4 document, the label print page and the signature canvas (paper), the audit camera, the audit QR frame and the scanner input (camera imagery), the attachment preview's stage (open issue NG-b) and the bell's count dot (open issue NG-a). No owners. The test also pins three reader cases (counted, the style object, not counted) so the definition cannot drift.

**Files:**
- Modify: `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`)

**Changes at 388d4d5** (VFG lines when this task runs):

| VFG line | Now | Becomes |
|---|---|---|
| above `:313` (`// Every EXEMPT list of this file, by rule …`) | — | the header of the five new guards, `RAW_COLOR`, `RAW_COLOR_EXEMPT` (8 rows) and the N1 test |
| `:321` `  "mockup sizes": MOCKUP_TYPE_PX_EXEMPT,` (the last line of `EXEMPT_LISTS`) | — | `  N1: RAW_COLOR_EXEMPT,` after it |

The rows (exact; also in Step 3):

| File | count | kind | why | ruling |
|---|---|---|---|---|
| `src/components/asset-operations/operation-document-print.tsx` | 19 | permanent | the A4 paper: slate ink and lines on white, and the red void watermark | 2D §5.3, 2D-4 R17 |
| `src/components/asset-operations/signature-pad.tsx` | 1 | permanent | the signature canvas is white paper, and the signature prints | 2D-4 R17 |
| `src/components/assets/asset-label-print.tsx` | 12 | permanent | the label sheet prints black on white at its physical size | 2D §5.3, 2A §9.5 |
| `src/components/audit/audit-scan-camera.tsx` | 12 | permanent | the zoom, torch and stop controls on the camera image: a dark fill with white ink | 2D §5.3, 2D-4 R17 |
| `src/components/audit/audit-scan-panels.tsx` | 5 | permanent | the scan frame on the camera image: its dim surround and white corners | 2D §5.3, 2D-4 R17 |
| `src/components/layout/topbar.tsx` | 1 | permanent | the bell's unread count is white on the solid danger dot; a status -foreground token stays inside src/components/ui | 2A §9.8 #11, 2D-5 NG-R2 |
| `src/components/ui/attachment-preview-dialog.tsx` | 2 | permanent | the preview stage: black around a photo, white paper under a PDF page | 2D §5.3, 2D-5 NG-R2 |
| `src/components/ui/scanner-text-input.tsx` | 22 | permanent | the zoom and torch controls and the QR and serial scan frames on the camera image | 2D §5.3, 2D-4 R17 |

- [ ] **Step 1: The failing test.** Insert directly above the line that begins `// Every EXEMPT list of this file, by rule` (`:313`), followed by one blank line, exactly:

```ts
test("N1 colors come from the tokens, outside the paper and the camera imagery (spec 2D §5.4 item 1)", () => {
  const count = (source: string) => countMatchesByFile([{ path: "src/x.tsx", source }], RAW_COLOR)["src/x.tsx"] ?? 0
  assert.equal(count('"text-slate-950 hover:bg-white/15 print:bg-white text-red-600/10 border-t-black bg-[#fff] shadow-[0_0_8px_rgba(0,0,0,0.5)] fill-taupe-200"'), 8)
  assert.equal(count('<div style={{ boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.42)" }} /><div style={{ width }} />'), 1)
  assert.equal(count('"bg-surface text-primary-foreground text-danger bg-transparent whitespace-nowrap slate-950 bg-[var(--canvas)] shadow-[inset_0_-2px_0_var(--primary)] context-white"'), 0)
  assert.deepEqual(exemptProblems("N1", countMatchesByFile(sources, RAW_COLOR), RAW_COLOR_EXEMPT), [])
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/visual-foundation-guards.test.ts`. Expected to fail: "N1 colors come from the tokens, outside the paper and the camera imagery (spec 2D §5.4 item 1)" (`ReferenceError: RAW_COLOR is not defined`); the others pass (dry run: 27 tests, 26 pass).
- [ ] **Step 3: Implement.** Two exact edits.

  1. Insert directly above the line `test("N1 colors come from the tokens, outside the paper and the camera imagery (spec 2D §5.4 item 1)", () => {`, followed by one blank line, exactly:

```ts
// The five new guards of spec 2D §5.4 (D14), N1–N5 for its items 1–5. Each reads all of src with no budget: an EXEMPT
// list in the format above and, where a shared part must draw the thing itself, an OWNERS list of files (§5.2) that may
// count anything and never hold a row.
// N1: colors come from the tokens of src/app/globals.css. Raw is a Tailwind palette color (with or without /NN), white or
// black, or a color value written into a class (bg-[#…], shadow-[…rgba(…)…]) or into a style object. White ink on a
// solid fill is its -foreground token (the status ones only inside src/components/ui, tests/ui-overlay-guards.test.ts).
// Page metadata, the web manifest, print CSS, canvas strokes and the PDF styles are not class names and stay outside.
const RAW_COLOR = new RegExp(
  [
    String.raw`(?<![\w-])(?:[\w\-\[\]=&\/.]+:)*(?:bg|text|border(?:-[xytrblse])?|ring(?:-offset)?|outline|divide|fill|stroke|from|via|to|decoration|shadow|accent|caret|placeholder)-(?:(?:slate|gray|zinc|neutral|stone|mauve|olive|mist|taupe|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}|white|black)(?:\/\d+)?(?![\w-])`,
    String.raw`(?<![\w-])(?:[\w\-\[\]=&\/.]+:)*[a-z][\w-]*-\[[^\]\s"'\x60]*(?:#[\da-fA-F]{3,8}|(?:rgba?|hsla?|oklch|oklab)\()[^\]\s"'\x60]*\]`,
    String.raw`style=\{\{[^}]*?(?:#[\da-fA-F]{3,8}\b|(?:rgba?|hsla?|oklch|oklab)\()`,
  ].join("|"),
  "g",
)
// Paper and imagery keep their own colors (spec 2D §5.3, plan 2D-4 R17): the A4 document, the label sheet and the
// signature canvas are white paper; the camera controls and scan frames sit on the camera image; a photo or a PDF page
// shows on its own stage. The bell's count dot is the one white ink outside them (plan 2D-5 NG-R2).
const RAW_COLOR_EXEMPT: ExemptList = {
  "src/components/asset-operations/operation-document-print.tsx": { count: 19, kind: "permanent", why: "the A4 paper: slate ink and lines on white, and the red void watermark", ruling: "2D §5.3, 2D-4 R17" },
  "src/components/asset-operations/signature-pad.tsx": { count: 1, kind: "permanent", why: "the signature canvas is white paper, and the signature prints", ruling: "2D-4 R17" },
  "src/components/assets/asset-label-print.tsx": { count: 12, kind: "permanent", why: "the label sheet prints black on white at its physical size", ruling: "2D §5.3, 2A §9.5" },
  "src/components/audit/audit-scan-camera.tsx": { count: 12, kind: "permanent", why: "the zoom, torch and stop controls on the camera image: a dark fill with white ink", ruling: "2D §5.3, 2D-4 R17" },
  "src/components/audit/audit-scan-panels.tsx": { count: 5, kind: "permanent", why: "the scan frame on the camera image: its dim surround and white corners", ruling: "2D §5.3, 2D-4 R17" },
  "src/components/layout/topbar.tsx": { count: 1, kind: "permanent", why: "the bell's unread count is white on the solid danger dot; a status -foreground token stays inside src/components/ui", ruling: "2A §9.8 #11, 2D-5 NG-R2" },
  "src/components/ui/attachment-preview-dialog.tsx": { count: 2, kind: "permanent", why: "the preview stage: black around a photo, white paper under a PDF page", ruling: "2D §5.3, 2D-5 NG-R2" },
  "src/components/ui/scanner-text-input.tsx": { count: 22, kind: "permanent", why: "the zoom and torch controls and the QR and serial scan frames on the camera image", ruling: "2D §5.3, 2D-4 R17" },
}
```

  2. `EXEMPT_LISTS`. Old:

```ts
  "mockup sizes": MOCKUP_TYPE_PX_EXEMPT,
}
```

  New:

```ts
  "mockup sizes": MOCKUP_TYPE_PX_EXEMPT,
  N1: RAW_COLOR_EXEMPT,
}
```

- [ ] **Step 4: Guard edits.** None in FMG or LFG. `tests/ui-overlay-guards.test.ts` keeps its status `-foreground` rule (`c/ui` only), which is why the topbar row exists.
- [ ] **Step 5: Verify.** `node --test tests/visual-foundation-guards.test.ts tests/guard-exempt.test.ts tests/ui-overlay-guards.test.ts`; `npm test` (+1: 2180 tests, 2179 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint`. `node <tools>/eol.mjs tests/visual-foundation-guards.test.ts` prints the same number twice (dry run with VG-3: `375 375`).
- [ ] **Step 6: Commit.** `git add tests/visual-foundation-guards.test.ts` then `git commit -m "test(guards): colors come from the tokens outside the paper and the camera imagery, over all of src (2D-5 task 23, NG-6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 24 (NG-7): N2, dashed and dotted lines belong to the drop zone and the signature pad (`tests/visual-foundation-guards.test.ts`)

Spec §5.4 item 2; 2A `07-feedback.md:330`–`:331` (the allowed list for `border-dashed`); D14. `border-`, `divide-` or `outline-` `dashed`/`dotted`, behind any variants, over all of `src`. `OWNERS`: `src/components/ui/file-dropzone.tsx` (the drop target) and `src/components/asset-operations/signature-pad.tsx` (the signing area): drawing that line is their job, and they may count anything; both must exist. `EXEMPT` is `{}`: 2A's other three places are gone (Inventory). An empty state is `EmptyNote` / `ActionEmptyState`, never a dashed box (2D M21).

**Files:**
- Modify: `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`)

**Changes at 388d4d5** (VFG lines when this task runs):

| VFG line | Now | Becomes |
|---|---|---|
| above `:350` (`// Every EXEMPT list …`) | — | `DASHED_LINE`, `DASHED_LINE_OWNERS` (2 files), `DASHED_LINE_EXEMPT = {}` and the N2 test |
| `:359` `  N1: RAW_COLOR_EXEMPT,` | — | `  N2: DASHED_LINE_EXEMPT,` after it |

- [ ] **Step 1: The failing test.** Insert directly above the line that begins `// Every EXEMPT list of this file, by rule` (`:350`), followed by one blank line, exactly:

```ts
test("N2 a dashed or dotted line is drawn only by the drop zone and the signature pad (spec 2D §5.4 item 2)", () => {
  const count = (source: string) => countMatchesByFile([{ path: "src/x.tsx", source }], DASHED_LINE)["src/x.tsx"] ?? 0
  assert.equal(count('"border-dashed md:border-dotted divide-dashed outline-dotted"'), 4)
  assert.equal(count('"border-solid border-dashed-x decoration-dotted"'), 0)
  assert.deepEqual(DASHED_LINE_OWNERS.filter((path) => !existsSync(path)), [])
  assert.deepEqual(exemptProblems("N2", countMatchesByFile(sources, DASHED_LINE), DASHED_LINE_EXEMPT, DASHED_LINE_OWNERS), [])
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/visual-foundation-guards.test.ts`. Expected to fail: "N2 a dashed or dotted line is drawn only by the drop zone and the signature pad (spec 2D §5.4 item 2)" (`ReferenceError: DASHED_LINE is not defined`); dry run 28 tests, 27 pass.
- [ ] **Step 3: Implement.** Two exact edits.

  1. Insert directly above the line `test("N2 a dashed or dotted line is drawn only by the drop zone and the signature pad (spec 2D §5.4 item 2)", () => {`, followed by one blank line, exactly:

```ts
// N2: a dashed or dotted line marks a drop target or a signing area, drawn by its shared part (2A 07-feedback.md:331).
// An empty state is EmptyNote or ActionEmptyState, never a dashed box.
const DASHED_LINE = /(?<![\w-])(?:[\w\-\[\]=&\/.]+:)*(?:border|divide|outline)-(?:dashed|dotted)(?![\w-])/g
const DASHED_LINE_OWNERS = ["src/components/ui/file-dropzone.tsx", "src/components/asset-operations/signature-pad.tsx"]
const DASHED_LINE_EXEMPT: ExemptList = {}
```

  2. `EXEMPT_LISTS`. Old:

```ts
  N1: RAW_COLOR_EXEMPT,
}
```

  New:

```ts
  N1: RAW_COLOR_EXEMPT,
  N2: DASHED_LINE_EXEMPT,
}
```

- [ ] **Step 4: Guard edits.** None.
- [ ] **Step 5: Verify.** `node --test tests/visual-foundation-guards.test.ts tests/file-evidence-ui.test.ts tests/guard-exempt.test.ts`; `npm test` (+1: 2181 tests, 2180 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint`. `node <tools>/eol.mjs tests/visual-foundation-guards.test.ts` prints the same number twice (dry run: `390 390`).
- [ ] **Step 6: Commit.** `git add tests/visual-foundation-guards.test.ts` then `git commit -m "test(guards): dashed and dotted lines belong to the drop zone and the signature pad, over all of src (2D-5 task 24, NG-7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 25 (NG-8): N3, a raw `<button>` stays only in its shared part or as an exact EXEMPT row (`tests/visual-foundation-guards.test.ts`)

Spec §5.4 item 3, §5.1, §5.2, D2, D14; 2D-2 R10/R11, 2D-3 R5, 2D-4 R5 (each said "2D-5 lists them"); 2C plan 4 Task 8. Counts every raw `<button>` JSX tag in `src` (`findJsxTags(source, ["button"])`, which skips `//`, `/*` and `*` lines, NG-R4). `OWNERS`: the four `c/ui` parts whose job is that control (`row-actions`, `search-field`, `searchable-select`, `segmented`; 7 sites; each must exist). `EXEMPT`: the 17 files of the Inventory, 24 sites; one `phase 3` row, the topbar search's clear (D2), so the phase 3 test now lists 2 sites. Every other file counts 0: a new command is a `Button`, a link styled as one `buttonVariants`.

**Files:**
- Modify: `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`)

**Changes at 388d4d5** (VFG lines when this task runs):

| VFG line | Now | Becomes |
|---|---|---|
| `:5` | `import { countByFile, countMatchesByFile, findMatches, readSourceFiles } from "./helpers/source-files.ts"` (without VG-3: no `countByFile`) | `import { countByFile, countMatchesByFile, findJsxTags, findMatches, readSourceFiles } from "./helpers/source-files.ts"` |
| above `:364` (`// Every EXEMPT list …`) | — | `RAW_BUTTON_OWNERS` (4), `RAW_BUTTON_EXEMPT` (17 rows) and the N3 test |
| `:374` `  N2: DASHED_LINE_EXEMPT,` | — | `  N3: RAW_BUTTON_EXEMPT,` after it |
| `:381`, `:383` (the phase 3 test) | `["R2 src/components/assets/asset-register-table.tsx: 1"]`, sum `1` | + `"N3 src/components/layout/global-search.tsx: 1"`, sum `2` |

The rows (exact; also in Step 3):

| File | count | kind | why | ruling |
|---|---|---|---|---|
| `src/components/assets/asset-attachments.tsx` | 3 | permanent | the photo is the control: the checklist, gallery and evidence photos open their preview | 2D-3 R5 |
| `src/components/assets/asset-component-manager.tsx` | 1 | permanent | a candidate row: a pressed list option of two lines | 2D-3 R5 |
| `src/components/assets/asset-label-batch-tool.tsx` | 2 | permanent | the search result and recent queue rows: two lines that add the asset to the print list | 2D-3 R5 |
| `src/components/assets/asset-state-help-popover.tsx` | 1 | permanent | the 24px help circle in a field label row or a table head, with a 44px hit area below md | 2D-3 R5, the user 2026-10-16 |
| `src/components/assets/asset-thumbnail.tsx` | 1 | permanent | the thumbnail image is the control that opens the photo | 2D-3 R5 |
| `src/components/audit/audit-scan-camera.tsx` | 3 | permanent | zoom, torch and stop on the camera image, with their own dark fill and white ink | 2D-4 R5 |
| `src/components/audit/audit-scan-lookup-card.tsx` | 1 | permanent | a two-line register match that opens it | 2D-4 R5 |
| `src/components/audit/audit-scan-room-list.tsx` | 1 | permanent | the whole row of two to four lines opens the check sheet | 2D-4 R5 |
| `src/components/audit/audit-scan-room-picker.tsx` | 2 | permanent | the two-line room trigger under SheetTrigger asChild and the pressed room option | 2D-4 R5 |
| `src/components/audit/audit-scan-search.tsx` | 1 | permanent | the whole result row opens the check sheet | 2D-4 R5 |
| `src/components/auth/login-form.tsx` | 1 | permanent | the show-password toggle inside the password field, as SearchField's own clear button | 2C plan 4 Task 8, 2D-5 NG-R4 |
| `src/components/disposal/disposal-asset-picker.tsx` | 1 | permanent | a listbox option with its own check box and two lines | 2D-4 R5 |
| `src/components/layout/global-search.tsx` | 1 | phase 3 | the clear button of the topbar search, which phase 3 redoes | 2D D2, 2D-2 R10 |
| `src/components/layout/mobile-field-navigation.tsx` | 1 | permanent | the bottom bar's More item: a navigation item that opens the drawer, styled as its sibling links | 2D-2 R11 |
| `src/components/layout/sidebar.tsx` | 1 | permanent | a sidebar group row that opens and closes its group, styled as the navigation rows | 2D-2 R11 |
| `src/components/maintenance/maintenance-attachments.tsx` | 1 | permanent | the image or the PDF preview is the control | 2D-4 R5 |
| `src/components/ui/scanner-text-input.tsx` | 2 | permanent | zoom and torch on the camera image, as the audit camera's | 2D-4 R5, R17 |

- [ ] **Step 1: The failing test.** Two exact edits.

  1. Insert directly above the line that begins `// Every EXEMPT list of this file, by rule` (`:364`), followed by one blank line, exactly:

```ts
test("N3 commands are Button; a raw <button> stays only in its shared part, a whole row, an image or a camera control (spec 2D §5.4 item 3)", () => {
  assert.deepEqual(RAW_BUTTON_OWNERS.filter((path) => !existsSync(path)), [])
  const counts = countByFile(sources, (file) => findJsxTags(file.source, ["button"]).length)
  assert.deepEqual(exemptProblems("N3", counts, RAW_BUTTON_EXEMPT, RAW_BUTTON_OWNERS), [])
})
```

  2. The phase 3 test (`:381`–`:383`). Old:

```ts
    ["R2 src/components/assets/asset-register-table.tsx: 1"],
  )
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 1)
```

  New:

```ts
    ["R2 src/components/assets/asset-register-table.tsx: 1", "N3 src/components/layout/global-search.tsx: 1"],
  )
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 2)
```

- [ ] **Step 2: Watch it fail.** `node --test tests/visual-foundation-guards.test.ts`. Expected to fail: "N3 commands are Button; a raw <button> stays only in its shared part, a whole row, an image or a camera control (spec 2D §5.4 item 3)" (`ReferenceError: RAW_BUTTON_OWNERS is not defined`) and "phase 3: every row the visual guards leave to phase 3, and their sum (spec 2D §5.1, D2)" (the N3 row is missing); dry run 29 tests, 27 pass. If the N3 test, after Step 3, names `src/components/ui/data-freshness-banner.tsx`, Task 13 (FG-1) has not run: stop and report.
- [ ] **Step 3: Implement.** Three exact edits.

  1. Insert directly above the line `test("N3 commands are Button; a raw <button> stays only in its shared part, a whole row, an image or a camera control (spec 2D §5.4 item 3)", () => {`, followed by one blank line, exactly:

```ts
// N3: commands are Button, or buttonVariants on a link. A raw <button> stays only in the shared part that is that
// control (OWNERS: the row next step and sheet menu, the search clear, the combobox trigger and clear, the segmented
// options) or where the whole row, the image or a control on the camera image is the button (EXEMPT, each with a comment
// at the site where the plan that kept it wrote one).
const RAW_BUTTON_OWNERS = ["src/components/ui/row-actions.tsx", "src/components/ui/search-field.tsx", "src/components/ui/searchable-select.tsx", "src/components/ui/segmented.tsx"]
const RAW_BUTTON_EXEMPT: ExemptList = {
  "src/components/assets/asset-attachments.tsx": { count: 3, kind: "permanent", why: "the photo is the control: the checklist, gallery and evidence photos open their preview", ruling: "2D-3 R5" },
  "src/components/assets/asset-component-manager.tsx": { count: 1, kind: "permanent", why: "a candidate row: a pressed list option of two lines", ruling: "2D-3 R5" },
  "src/components/assets/asset-label-batch-tool.tsx": { count: 2, kind: "permanent", why: "the search result and recent queue rows: two lines that add the asset to the print list", ruling: "2D-3 R5" },
  "src/components/assets/asset-state-help-popover.tsx": { count: 1, kind: "permanent", why: "the 24px help circle in a field label row or a table head, with a 44px hit area below md", ruling: "2D-3 R5, the user 2026-10-16" },
  "src/components/assets/asset-thumbnail.tsx": { count: 1, kind: "permanent", why: "the thumbnail image is the control that opens the photo", ruling: "2D-3 R5" },
  "src/components/audit/audit-scan-camera.tsx": { count: 3, kind: "permanent", why: "zoom, torch and stop on the camera image, with their own dark fill and white ink", ruling: "2D-4 R5" },
  "src/components/audit/audit-scan-lookup-card.tsx": { count: 1, kind: "permanent", why: "a two-line register match that opens it", ruling: "2D-4 R5" },
  "src/components/audit/audit-scan-room-list.tsx": { count: 1, kind: "permanent", why: "the whole row of two to four lines opens the check sheet", ruling: "2D-4 R5" },
  "src/components/audit/audit-scan-room-picker.tsx": { count: 2, kind: "permanent", why: "the two-line room trigger under SheetTrigger asChild and the pressed room option", ruling: "2D-4 R5" },
  "src/components/audit/audit-scan-search.tsx": { count: 1, kind: "permanent", why: "the whole result row opens the check sheet", ruling: "2D-4 R5" },
  "src/components/auth/login-form.tsx": { count: 1, kind: "permanent", why: "the show-password toggle inside the password field, as SearchField's own clear button", ruling: "2C plan 4 Task 8, 2D-5 NG-R4" },
  "src/components/disposal/disposal-asset-picker.tsx": { count: 1, kind: "permanent", why: "a listbox option with its own check box and two lines", ruling: "2D-4 R5" },
  "src/components/layout/global-search.tsx": { count: 1, kind: "phase 3", why: "the clear button of the topbar search, which phase 3 redoes", ruling: "2D D2, 2D-2 R10" },
  "src/components/layout/mobile-field-navigation.tsx": { count: 1, kind: "permanent", why: "the bottom bar's More item: a navigation item that opens the drawer, styled as its sibling links", ruling: "2D-2 R11" },
  "src/components/layout/sidebar.tsx": { count: 1, kind: "permanent", why: "a sidebar group row that opens and closes its group, styled as the navigation rows", ruling: "2D-2 R11" },
  "src/components/maintenance/maintenance-attachments.tsx": { count: 1, kind: "permanent", why: "the image or the PDF preview is the control", ruling: "2D-4 R5" },
  "src/components/ui/scanner-text-input.tsx": { count: 2, kind: "permanent", why: "zoom and torch on the camera image, as the audit camera's", ruling: "2D-4 R5, R17" },
}
```

  2. `EXEMPT_LISTS`. Old:

```ts
  N2: DASHED_LINE_EXEMPT,
}
```

  New:

```ts
  N2: DASHED_LINE_EXEMPT,
  N3: RAW_BUTTON_EXEMPT,
}
```

  3. The one `./helpers/source-files.ts` import (`:5`). After VG-3 it is `import { countByFile, countMatchesByFile, findMatches, readSourceFiles } from "./helpers/source-files.ts"`; without VG-3 it is `import { countMatchesByFile, findMatches, readSourceFiles } from "./helpers/source-files.ts"`. Either way it becomes `import { countByFile, countMatchesByFile, findJsxTags, findMatches, readSourceFiles } from "./helpers/source-files.ts"`.
- [ ] **Step 4: Guard edits.** None in FMG or LFG (FMG GD3 still forbids a raw `<button>` inside a dialog footer).
- [ ] **Step 5: Verify.** `node --test tests/visual-foundation-guards.test.ts tests/guard-exempt.test.ts tests/guard-lock-sweep-ui.test.ts`; `npm test` (+1: 2182 tests, 2181 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint`. `node <tools>/eol.mjs tests/visual-foundation-guards.test.ts` prints the same number twice (dry run: `422 422`).
- [ ] **Step 6: Commit.** `git add tests/visual-foundation-guards.test.ts` then `git commit -m "test(guards): a raw button stays only in its shared part or as an exact EXEMPT row, over all of src (2D-5 task 25, NG-8)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 26 (NG-9): N4, nothing fades through opacity when it is disabled (`tests/visual-foundation-guards.test.ts`)

Spec §5.4 item 4; DESIGN.md Buttons ("Disabled: never faded with opacity"); D14. An `opacity-<n>` or `opacity-[…]` behind any variant chain that holds `disabled` (`disabled:`, `aria-disabled:`, `group-disabled:`, `peer-disabled:`, `has-[:disabled]:`, `data-[disabled]:`), over all of `src` (NG-R5). LFG LT5 keeps the other form, a bare `opacity-<n>` with `pointer-events-none` or `cursor-not-allowed` on one line. No owners, `EXEMPT` `{}`: after Task 20 (NG-1) and Task 13 (FG-1) the count is 0.

**Files:**
- Modify: `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`)

**Changes at 388d4d5** (VFG lines when this task runs):

| VFG line | Now | Becomes |
|---|---|---|
| above `:395` (`// Every EXEMPT list …`) | — | `DISABLED_FADE`, `DISABLED_FADE_EXEMPT = {}` and the N4 test |
| `:406` `  N3: RAW_BUTTON_EXEMPT,` | — | `  N4: DISABLED_FADE_EXEMPT,` after it |

- [ ] **Step 1: The failing test.** Insert directly above the line that begins `// Every EXEMPT list of this file, by rule` (`:395`), followed by one blank line, exactly:

```ts
test("N4 nothing fades through opacity when it is disabled (spec 2D §5.4 item 4)", () => {
  const count = (source: string) => countMatchesByFile([{ path: "src/x.tsx", source }], DISABLED_FADE)["src/x.tsx"] ?? 0
  assert.equal(count('"disabled:opacity-60 aria-disabled:opacity-50 group-disabled:opacity-[.4] has-[:disabled]:opacity-70 md:disabled:hover:opacity-80"'), 5)
  assert.equal(count('"opacity-50 disabled:bg-background disabled:text-faint-foreground hover:opacity-80"'), 0)
  assert.deepEqual(exemptProblems("N4", countMatchesByFile(sources, DISABLED_FADE), DISABLED_FADE_EXEMPT), [])
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/visual-foundation-guards.test.ts`. Expected to fail: "N4 nothing fades through opacity when it is disabled (spec 2D §5.4 item 4)" (`ReferenceError: DISABLED_FADE is not defined`); dry run 30 tests, 29 pass. If it names `src/components/ui/data-freshness-banner.tsx` after Step 3, stop and report (as NG-8).
- [ ] **Step 3: Implement.** Two exact edits.

  1. Insert directly above the line `test("N4 nothing fades through opacity when it is disabled (spec 2D §5.4 item 4)", () => {`, followed by one blank line, exactly:

```ts
// N4: nothing fades when it is disabled. Button's disabled look is the background fill with faint ink, and busy keeps
// focus (FMG GB4). Any variant that holds "disabled" counts: disabled:, aria-disabled:, group-disabled:, has-[:disabled]:.
// An opacity with pointer-events-none or cursor-not-allowed on one line is LFG LT5's.
const DISABLED_FADE = /(?<=^|[\s"'`{(,])[^\s"'`{}(),]*disabled[^\s"'`{}(),]*:opacity-(?:\d+|\[[^\]\s"'`]*\])(?![\w-])/g
const DISABLED_FADE_EXEMPT: ExemptList = {}
```

  2. `EXEMPT_LISTS`. Old:

```ts
  N3: RAW_BUTTON_EXEMPT,
}
```

  New:

```ts
  N3: RAW_BUTTON_EXEMPT,
  N4: DISABLED_FADE_EXEMPT,
}
```

- [ ] **Step 4: Guard edits.** None.
- [ ] **Step 5: Verify.** `node --test tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/guard-exempt.test.ts`; `npm test` (+1: 2183 tests, 2182 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint`. `node <tools>/eol.mjs tests/visual-foundation-guards.test.ts` prints the same number twice (dry run: `436 436`).
- [ ] **Step 6: Commit.** `git add tests/visual-foundation-guards.test.ts` then `git commit -m "test(guards): nothing fades through opacity when it is disabled, over all of src (2D-5 task 26, NG-9)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 27 (NG-10): N5, buttons and button-like links set no height at `sm:` (`tests/visual-foundation-guards.test.ts`)

Spec §5.4 item 5, D3 ("below `md` every size is 44px"); DESIGN.md Buttons (sizes switch at `md`; `className` keeps layout classes only). Counts `sm:h-`, `sm:min-h-`, `sm:max-h-` and `sm:size-` in the class text of: a `Button` or a raw `<button>` tag; the first tag inside a `<Button asChild>`; any tag whose text calls `buttonVariants(` (a button-like link); and a line outside a tag that calls `buttonVariants(` (a class constant) (NG-R6). Widths (`sm:w-auto`), `max-sm:` and non-buttons do not count. No owners (`button-variants.ts` sizes switch at `md:` and never use `sm:`), `EXEMPT` `{}`: after NG-3 the count is 0.

**Files:**
- Modify: `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`)

**Changes at 388d4d5** (VFG lines when this task runs):

| VFG line | Now | Becomes |
|---|---|---|
| `:5` | `import { countByFile, countMatchesByFile, findJsxTags, findMatches, readSourceFiles } from "./helpers/source-files.ts"` | add `findJsxElements` and `hasJsxAttr` (alphabetical) |
| above `:408` (`// Every EXEMPT list …`) | — | `SM_HEIGHT`, `ANY_TAG`, `buttonClassTexts`, `smButtonHeights`, `SM_BUTTON_HEIGHT_EXEMPT = {}` and the N5 test |
| `:420` `  N4: DISABLED_FADE_EXEMPT,` | — | `  N5: SM_BUTTON_HEIGHT_EXEMPT,` after it |

- [ ] **Step 1: The failing test.** Insert directly above the line that begins `// Every EXEMPT list of this file, by rule` (`:408`), followed by one blank line, exactly:

```ts
test("N5 buttons and button-like links set no height at sm:, so they switch at md with their size (spec 2D §5.4 item 5)", () => {
  const source = [
    '<Button size="sm" className="w-full sm:h-10">a</Button>',
    '<Link className={cn(buttonVariants({ size: "sm" }), "sm:min-h-0 sm:size-8")} href="/" />',
    '<Button asChild><a className="sm:max-h-9" href="/">b</a></Button>',
    '<div className="sm:h-10" /><Image className="sm:h-[72px]" alt="" />',
    'const linkClasses = cn(buttonVariants({ variant: "outline" }), "sm:h-9")',
    '<button className="max-sm:h-12 md:h-9 sm:w-auto" />',
  ].join("\n")
  assert.equal(smButtonHeights(source), 5)
  assert.deepEqual(exemptProblems("N5", countByFile(sources, (file) => smButtonHeights(file.source)), SM_BUTTON_HEIGHT_EXEMPT), [])
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/visual-foundation-guards.test.ts`. Expected to fail: "N5 buttons and button-like links set no height at sm:, so they switch at md with their size (spec 2D §5.4 item 5)" (`ReferenceError: smButtonHeights is not defined`); dry run 31 tests, 30 pass.
- [ ] **Step 3: Implement.** Three exact edits.

  1. Insert directly above the line `test("N5 buttons and button-like links set no height at sm:, so they switch at md with their size (spec 2D §5.4 item 5)", () => {`, followed by one blank line, exactly:

```ts
// N5: a button changes height at md, where its size does (spec 2D D3: below md every size is at least 44px). No height,
// min-height, max-height or size at sm: on a Button or a raw <button>, on the element a <Button asChild> styles, on an
// element whose class comes from buttonVariants (a button-like link), or on a line that calls buttonVariants.
const SM_HEIGHT = /(?<![\w-])sm:(?:h|min-h|max-h|size)-/g
const ANY_TAG = ["[A-Za-z][\\w.]*"]
function buttonClassTexts(source: string): string[] {
  const tags = findJsxTags(source, ANY_TAG)
  const texts = tags.filter((tag) => tag.name === "Button" || tag.name === "button" || tag.text.includes("buttonVariants(")).map((tag) => tag.text)
  for (const button of findJsxElements(source, "Button")) {
    const child = hasJsxAttr(button.text, "asChild") ? findJsxTags(button.children ?? "", ANY_TAG)[0] : undefined
    if (child) texts.push(child.text)
  }
  // A class built with buttonVariants outside a tag, such as const linkClasses = cn(buttonVariants(…), "…").
  for (const line of source.split("\n")) if (line.includes("buttonVariants(") && !tags.some((tag) => tag.text.includes(line.trim()))) texts.push(line)
  return texts
}
const smButtonHeights = (source: string) => buttonClassTexts(source).reduce((sum, text) => sum + (text.match(SM_HEIGHT)?.length ?? 0), 0)
const SM_BUTTON_HEIGHT_EXEMPT: ExemptList = {}
```

  2. `EXEMPT_LISTS`. Old:

```ts
  N4: DISABLED_FADE_EXEMPT,
}
```

  New:

```ts
  N4: DISABLED_FADE_EXEMPT,
  N5: SM_BUTTON_HEIGHT_EXEMPT,
}
```

  3. The import (`:5`). Old `import { countByFile, countMatchesByFile, findJsxTags, findMatches, readSourceFiles } from "./helpers/source-files.ts"` → new `import { countByFile, countMatchesByFile, findJsxElements, findJsxTags, findMatches, hasJsxAttr, readSourceFiles } from "./helpers/source-files.ts"`.
- [ ] **Step 4: Guard edits.** None.
- [ ] **Step 5: Verify.** `node --test tests/visual-foundation-guards.test.ts tests/guard-exempt.test.ts tests/guard-lock-sweep-ui.test.ts`; `npm test` (+1: 2184 tests, 2183 pass, 0 fail, 1 skipped; the area adds 8); `npx tsc --noEmit`; `npm run lint`. `node <tools>/eol.mjs tests/visual-foundation-guards.test.ts` prints the same number twice (dry run: `469 469`).
- [ ] **Step 6: Commit.** `git add tests/visual-foundation-guards.test.ts` then `git commit -m "test(guards): buttons and button-like links set no height at sm:, over all of src (2D-5 task 27, NG-10)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

## Area DC: the last docs pass (Tasks 28–30, then 32)

Spec 2D §1 point 5 ("ไม่เหลือข้อความ "until 2D" หรือ "2D moves""), §3.5 (the last docs pass, M35), §6 and §8 rulings 1–2; the user's D1, D2, D13, D14 and the answers of 2026-10-16/17 (the help trigger's 44px hit area, the two-line `StatStrip` foot, codes inside translated sentences wait for phase 3). Four implementer tasks, one commit each: `DESIGN.md` (DC-1), `docs/14_UI_UX_DESIGN_SYSTEM.md` (DC-2), `.impeccable/design.json` (DC-3), then this plan's own `DEVELOPER_HANDOFF.md` section and `docs/99_CHANGELOG.md` entry (DC-4), the pair 2D-4 Task 53 also wrote together. Each task appends one test to the new `tests/phase2d-docs.test.ts`, which fails before that commit; the spec §1 point 5 phrase check lives there (DC-R3). The controller adds the verify numbers and the wiki afterwards (Task 33).

**Order (DC-R8).** The DC tasks come after every code and guard task of this plan, because their sentences state what those tasks leave: the `EXEMPT` / `OWNERS` format, the five new guards, the two carried fixes. DC-1 to DC-3 need only those tasks. DC-4 also reads the findings file of the controller's verify and dev-app task (as 2D-4 Task 53 read `task-52-findings.md`), so it runs after that task and before the controller's final verify-numbers, wiki and memory task.

**Line numbers** are of `388d4d5` and were checked with `<tools>/dc-lines.mjs` (every old text starts on the stated line). No other task of this plan edits these five files, so they hold when the DC tasks run; the Edit tool finds each site by its quoted text anyway and refuses an old text that is missing or occurs twice, which is the check (J8, 20 occurrences, uses `replace_all`).

**Markers.**
- `<from plan: …>` (DC-4 only): filled in this plan from Tasks 1–27 (R9); none should reach an implementer (if one does, the implementer stops and reports).
- `<today>` (DC-3 and DC-4), `<N>` (the test count of the controller's verify task), `<P3>` and `<P3F>` (the `phase 3` sites and their files, DC-4 Step 3) and `<from task-findings>` / `<จาก task-findings>` (the controller's findings file): filled by the DC-3 and DC-4 implementers. DC-4's test fails while any is left.

### Inventory (live at `388d4d5`)

Counted read-only with `<tools>/count-dc.mts`, `count-dc-fields.mts`, `dc-dialogs.mts`, `dc-stale-history.mjs` and the five new guards' draft counters `ng-rules.mts` (cwd = the repo; they import `tests/helpers/source-files.ts` and use the guards' own regexes).

**A. Stale phrases** (spec §1 point 5 and the near forms found: `until (phase) 2D`, `2D move(s)`, `phase 2D sets/empties/widens/moves`, `2D-5's`, `wait(s) for (plan) 2D-5`, `2D-4 and 2D-5 still move/own`):

| Site | Text | Decision |
|---|---|---|
| `DESIGN.md:260` | "appeared teal until phase 2D moved them" (past tense, in the closed known exception) | fix, D3 (rewritten, not exempted: DC-R3) |
| `DESIGN.md:302` | "a synthesized bold until 2D moves it to `tag`" | fix, D6 (0 such class strings left) |
| `DESIGN.md:377` | "keep their own classes until 2D moves them", "a comment for 2D-5's `OWNERS`/`EXEMPT` lists" | fix, D11 |
| `DESIGN.md:467` | "has no guard until 2D (spec 2B I34)" | fix, D18 (M19) |
| `DESIGN.md:606` | "and phase 2D empties them" | fix, D22 (spec §6 ":603") |
| `docs/14_UI_UX_DESIGN_SYSTEM.md:99` | "phase 2D move the rest", "phase 2D sets every budget to `{}`" | fix, X3 (spec §6 "docs/14:98", §8 ruling 1) |
| `.impeccable/design.json:499` | "Until phase 2D, info notices, role chips and a few info icons also use the info tokens" | fix, J11 (spec §6 ":499") |
| `DEVELOPER_HANDOFF.md:328`, `:334`, `:375`, `:491`, `:554`, `:764`, `:775`, `:817`, `:879`, `:914`, `:931`, `:981`, `:1006` | "until 2D" / "wait for 2D-5's …" in the dated sections of 2A to 2D-4 | keep as history (DC-R1); the 2D-5 section closes them in its Docs bullet (H3) |
| `docs/99_CHANGELOG.md` | none | — |

**B. Old guard words** (the shape 2D-5 replaces with `EXEMPT` / `OWNERS`):

| Site | Text | Decision |
|---|---|---|
| `DESIGN.md:266` | "the ratchet guards `R1 …` and `R7 …`" | fix, D4 |
| `DESIGN.md:285` | "(guard LH1 `KEEP`)" | fix, D5 (the login title stays `phase 3`, area LG R-LG3) |
| `DESIGN.md:336` | R2 "holds these 8 in a per-file budget that may only go down" | fix, D8 |
| `DESIGN.md:378` | "Guard GD4 holds the remaining `flex-col-reverse` lines in a per-file budget" | fix, D12 (0 left) |
| `DESIGN.md:407` | "A dialog that has not moved to the parts yet scrolls as before." (FMG `PENDING_FOOTER_PARTS` is empty) | fix, D13 |
| `DESIGN.md:467` | `MIGRATED_FILTER_FILES`; FMG "a per-file budget … that may only go down"; "The 3 hand-written fields left" | fix, D17, D18 |
| `DESIGN.md:566` | "every one a `KEEP` row for phase 2D" (history of 2B-5); "Print pages, PDFs and label data keep `"-"`" | fix the word only (D20); D21 |
| `DESIGN.md:606` | "hold what is left to its `KEEP` row" | fix, D22 |
| `docs/14_UI_UX_DESIGN_SYSTEM.md:99` | "ratchet guards … per-file budgets go down, never up … (`KEEP`, test L9)" | fix, X3 |
| `docs/14_UI_UX_DESIGN_SYSTEM.md:118` | "four codemods with ratchet guards" (the registry's summary of the 2A spec) | keep: it describes that record |
| `.impeccable/design.json:534` | "a per-file budget guard keeps the rest from coming back" | fix, J12 |

**C. Other stale or missing content:**

| Site | Now | Decision |
|---|---|---|
| `DESIGN.md:195` | the overview stops at 2C plan 1 (spec §6 ":195"); no 2B, 2D or guard lock | fix, D1 |
| `DESIGN.md:207`, `:372`, `:437`, `:623` | no word on four of the five new guards (D14: raw colors, `disabled:opacity-*`, `border-dashed`, heights at `sm:`) | fix, D2, D9, D14, D23; the fifth (raw `<button>`) is D11 |
| `DESIGN.md:302` | codes in translated sentences: "which phase 2D does not add" | fix, D7 (phase 3, the user 2026-10-16) |
| `DESIGN.md:373` | the busy-label rule names no guard | fix, D10 (GB3, spec §5.5) |
| `DESIGN.md:442` | LK1 "after plan 2B-4 the last one is `Info` in `asset-movement-timeline.tsx` (2D)" (0 `LOCAL_KEY_VALUE` functions in `src`) | fix, D15 |
| `DESIGN.md:443` | `StatStrip` "an optional faint foot line" (one line: `truncate` at `c/ui/stat-strip.tsx:59`, comment `:15`) | fix, D16 (two lines, the user; the 2D-4 dev-app check, DH `:1010`) |
| `DESIGN.md:554` | "their 24px help button" (`c/assets/asset-state-help-popover.tsx:38` `h-6 w-6`, no hit area) | fix, D19 (44px to tap on phones, the user) |
| `docs/14_UI_UX_DESIGN_SYSTEM.md:57`, `:82` | the Button and `StatStrip` rows | fix, X1, X2 |
| `docs/14_UI_UX_DESIGN_SYSTEM.md:107-121` | the Current-Surface Registry has no phase 2D row (the 2A, 2B and 2C specs have one; Change Maintenance `:137` asks for it) | fix, X4 (DC-R5) |
| `.impeccable/design.json:3` | `"generatedAt": "2026-10-13T00:00:00+07:00"` | fix, J1 |
| `.impeccable/design.json:355`, `:363`, `:403` | the two buttons, the dialog X and the footer buttons 40px from 768px with 16px padding (spec §6) | fix, J2–J7 (36px and 14px: `sizeMd` `c/ui/button-variants.ts:8`, `sizeIcon` `:11`) |
| `.impeccable/design.json`, 20 css strings | `"IBM Plex Sans", "IBM Plex Sans Thai", …` (the code loads Noto Sans Thai Looped since 2026-10-16, `src/app/layout.tsx:9`; `typographyMeta` already says so) | fix, J8 |
| `.impeccable/design.json:457`, `:459` | `StatStrip` one foot line | fix, J9, J10 |
| `.impeccable/design.json:544` | `dos[0]`: "the panel, table shell and mobile card list helpers" (`getTableShellClasses` deleted in 2D-1) and none of the 2B or 2D parts (spec §6 "ของกลางของ 2B") | fix, J13 (as `DESIGN.md:584`) |
| `.impeccable/design.json:552-563` | `donts` lack two of `DESIGN.md` §6 (`:604` disabled opacity, `:606` list-frame helpers) | fix, J14, J15 |
| `DEVELOPER_HANDOFF.md:3` | "Last updated: 2026-10-07" | fix, H1 |
| `DEVELOPER_HANDOFF.md:887` | 2C plan 5: "the last 3 `ActionButton` call sites) is unchanged" (spec §8 ruling 2: 9 / 7 / 3 → 1; the 2B-5 section `:827` already names the one site, `D/error.tsx:30` at `71597e5`) | fix, H2; `:770` (2C plan 4, written before 2B-5 moved two) keeps its 3 |
| `DEVELOPER_HANDOFF.md:1020`, `docs/99_CHANGELOG.md:9` | no 2D-5 record | fix, H3, C1 |

**D. Checked and true at `388d4d5`, not changed:**
- `DESIGN.md:260` (0 `bg-/text-/border-info*` outside `c/ui`), `:285` (four `h1` outside `PageHeader`: the login page, the A4 document, the label print page, the scan header), `:336` (8 shadows in 7 files: `c/ui/scanner-text-input.tsx` 2, `c/audit/audit-scan-check-form.tsx`, `c/assets/asset-label-print.tsx`, `c/asset-operations/operation-document-print.tsx`, `c/admin/system-settings-form.tsx`, `c/layout/mobile-field-navigation.tsx`, `c/assets/asset-register-table.tsx` 1 each).
- `DESIGN.md:355`, `:357` (36px since 2D-1; spec §6's ":354/:356"), `:376` (Legacy: none left), `:400` (spec §6's ":398": `colorCode` is still selected on eight pages and in three tool types but never styled; the label tool and the scan search take the tone from `status.name` since 2D-3), the frontmatter `components` (buttons 36px, 14px padding).
- `DESIGN.md:332` (the spinners of `Button busy` and `SearchField` stop under reduced motion; Task 15 (FG-3) widens GB2 to every spinner), `:523` (`TABLE_HEADER_FILLS` `{}`, the name kept, D13), `:535` (`dataTable*Classes` still read by `c/ui/clickable-table-row.tsx`), `:566` (LV2 29 on pages and components, LV3 0, `formatCurrency` 0 in `src`), `:626` (LP1: none left; still true when LP1 reads all of `src`).
- `docs/14_UI_UX_DESIGN_SYSTEM.md:42`, `:69`, `:94` and the other rows; `:118` is the 2A record's summary.
- `docs/11_FEATURE_LIST.md`, `docs/07_UAT_CHECKLIST.md`, `README.md`, `PRODUCT.md`: no feature or UAT step changes in 2D-5. No test reads `DESIGN.md` or `.impeccable/design.json` (only comments name `DESIGN.md`); `tests/audit-round-cancellation.test.ts` reads the handoff and the changelog for the round cancellation words, which stay.

**E. What the handoff handed to 2D-5, and where this plan closes it:**

| From | Item | Closed by |
|---|---|---|
| DH 2D-1 `:912` | `.impeccable/design.json` button heights | DC-3 (J2–J7) |
| DH 2D-1 `:912` | FMG `BUSY_LABEL_SWAPS` | Task 13 (FG-1, GB3's general rule, spec §5.5); D10, H3 "The three guard files" |
| DH 2D-2 `:931`, `:933` | the raw buttons of the sidebar group row, the mobile "More" item and the global search clear (phase 3) | Task 25 (NG-8, N3's `OWNERS` / `EXEMPT`); D11, H3 |
| DH 2D-2 `:932`, `:933` (R14) | `DashboardPageSkeleton`'s old shape, the four label props the settings page passes and the form never reads, the English literals on Thai screens (LDAP sync modes, "months", "d"), "กำลังโหลด clients" | Tasks 3–6 (CF-3 to CF-6); H3 "Carried fixes" |
| DH 2D-3 `:981`, `:983` | R5 raw buttons (photo buttons, component candidates, label tool rows, the state help trigger, the thumbnail preview) | the raw-button guard; D11 |
| DH 2D-4 `:1006`, `:1008` | R5 (10 in 7 files) and R17's print and camera colors | the raw-button and raw-color guards; D2, D11 |
| DH 2D-1 to 2D-4 | `.impeccable/design.json` | DC-3 |
| DH 2D-4 `:1010` and the user, 2026-10-17 | the `StatStrip` foot cut at 375 → two lines | Task 2 (CF-2, `c/ui/stat-strip.tsx`); D16, X2, J9, J10, H3, C1 |
| the user, 2026-10-16/17 | the 24px help trigger gets a 44px hit area on phones | Task 1 (CF-1, `c/assets/asset-state-help-popover.tsx`); D19, H3, C1 |
| DH 2D-4 `:1008`, the user 2026-10-16 | codes inside translated sentences | phase 3, not this plan; D7, H3 "Not taken" |

**F. Code facts the new sentences state** (all of `src` at `388d4d5` unless said; the guard tasks before DC change the raw-color, `disabled:opacity-*`, raw `<button>` and `sm:` rows):

| Fact | Count | Used by |
|---|---|---|
| a class string with `font-mono` and `font-semibold`/`font-bold` | 0 | D6 |
| `flex-col-reverse` | 0 | D12 |
| `function` names of `LOCAL_KEY_VALUE` | 0 (the regex names 16) | D15 |
| `AccessibleDialog` tags / files with fewer `AccessibleDialogFooter`s | 23 / 0 (`PENDING_FOOTER_PARTS` empty) | D13 |
| VFG R2 surface shadows | 8 in 7 files (area VG: 6 `permanent` rows with 7 sites, 1 `phase 3`) | D8, J12 |
| FMG GF2 raw fields | 7 in 6 files: `c/ui/input.tsx`, `native-select.tsx`, `textarea.tsx` 1 each (owners), `c/assets/asset-label-print.tsx` 2 (K21), `c/audit/audit-scan-room-picker.tsx` 1 (O20), `c/layout/global-search.tsx` 1 (`phase 3`) | D17 |
| FMG GF3 field class strings | 4 in 2 files: `c/ui/field-variants.ts` 3 (owner), `c/layout/global-search.tsx` 1 (`phase 3`) | D1 (the topbar search) |
| `<form … role="search">` | 14 in 14 files (`MIGRATED_FILTER_FILES` lists 13; area LG reads every form) | D18 |
| raw colors (the new guard's draft regex) | 76 in 9 files: the print paper (`operation-document-print.tsx` 19, `asset-label-print.tsx` 12, the `SignaturePad` canvas 1), the camera imagery (`scanner-text-input.tsx` 23, `audit-scan-camera.tsx` 12, the QR overlay in `audit-scan-panels.tsx` 5), and 4 more (`text-white` on the round scan button and the topbar count dot, the attachment preview's `bg-black` / `bg-white`) that Tasks 21 and 23 move or list | D2 ("such as") |
| `border-dashed` | 2 in 2 files: `c/ui/file-dropzone.tsx`, `c/asset-operations/signature-pad.tsx` | D14 |
| `disabled:opacity-*` | 3 in 2 files: `c/ui/scanner-text-input.tsx` 2, `c/ui/data-freshness-banner.tsx` 1, which Tasks 20 and 13 move | D9 states the end state |
| raw `<button>` JSX tags | 33 in 22 files (36 text matches; 3 are comments: `c/ui/button.tsx:15`, `c/ui/field-variants.ts:9`, `src/lib/design-system.ts:38`) | D11 states the rule; the rows are Task 25's (R8) |
| a height at `sm:` on a button | 1: the login show-password toggle `c/auth/login-form.tsx:111` (`sm:min-h-10 sm:min-w-10`) | D23 states the end state |
| `.impeccable/design.json` | valid JSON, LF, 566 lines, 20 `\"IBM Plex Sans Thai\"`, 5 `height: 40px` (the two buttons, the dialog X and footer change; the Text Field stays) | J2–J8 |

### Interfaces this area consumes

The DC sentences, their fact checks and the test regexes assume these from the other areas of this plan. If an area names or places one differently, the controller changes the DC text and the matching test assertion together when it joins the plan (R9):
- `tests/helpers/guard-exempt.ts` with `ExemptKind`, `ExemptEntry`, `ExemptList`, `exemptProblems`, `phase3Rows` (the fixed interface); the words `EXEMPT` and `OWNERS` for the lists; each `EXEMPT` row on one line as `<file key>: { count: <n>, kind: "<kind>", why: …, ruling: … }` (areas VG and LG write them so), and a test per guard file that lists its `phase 3` rows (area VG, VG-R6).
- VFG keeps the test titles `R1 tone colors never fade with opacity`, `R7 neutral fills are opaque tokens, table headers included` and `R2 only floating layers, camera controls and paper previews cast a shadow`, keeps `TABLE_HEADER_FILLS` (`{}`), and R2's `EXEMPT` is the 8 shadows above: 7 `permanent` sites and `c/assets/asset-register-table.tsx` `phase 3` (D4, D8, J12).
- FMG keeps the ids GB3, GD2, GD4, GF2 and their meaning, reads all of `src`, and GF2's `EXEMPT` holds the label print toolbar 2 (K21) and the room search 1 (O20) `permanent` and `c/layout/global-search.tsx` `phase 3`, with `c/ui/input.tsx`, `native-select.tsx` and `textarea.tsx` as `OWNERS` (D10, D12, D13, D17, D18).
- LFG keeps the ids LH1, LK1, LV2 and the constant `LOCAL_KEY_VALUE`; its LV2 rows are all `permanent`; the login `<h1>` is LH1's `phase 3` row (area LG) (D5, D15, D21, D22).
- `tests/list-filters-ui.test.ts` checks every filter form in `src`, and `MIGRATED_FILTER_FILES` is gone (M19, area LG) (D18).
- The five new guards exist as spec §5.4 words them: raw colors (what keeps its own colors is an `EXEMPT` row, among them the print paper and the camera imagery), `border-dashed` only in `FileDropzone` and the `SignaturePad` canvas, raw `<button>` only in `OWNERS` or at `EXEMPT` rows, no `disabled:opacity-*` left in `src`, no button height at `sm:` left in `src` (D2, D9, D11, D14, D23).
- The carried fixes: `c/ui/stat-strip.tsx` shows a foot on at most two lines before its ellipsis and keeps `footTitle`; `c/assets/asset-state-help-popover.tsx` keeps the 24px circle with a 44px hit area below `md` (D16, D19, X2, J9, J10, H3, C1).

### Global for the DC tasks

- `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `DEVELOPER_HANDOFF.md` and `docs/99_CHANGELOG.md` are `i/lf w/crlf`; `.impeccable/design.json` is `i/lf w/lf` (tracked); the new `tests/phase2d-docs.test.ts` is LF. Edit with exact-string replacement (the Edit tool keeps a file's endings, also for a multi-line new text); never a formatter; never normalize. `git add tests/phase2d-docs.test.ts` prints the harmless "LF will be replaced by CRLF" warning. Leave the untracked `.impeccable/config.json` and `.impeccable/critique/` alone.
- Check endings with `node <tools>/eol.mjs <file>`: a CRLF file prints the same number twice, an LF file 0 and its line count. A file that `git diff --numstat` shows with every line changed was normalized: restore it.
- The phrase check reads only the three canonical docs (DC-R1, DC-R3). New text in them must not contain "until 2D", "until phase 2D", "2D moves", "phase 2D sets", "2D-5's" or "waits for 2D-5" (the test reads its own three files).
- Each task adds one test: `npm test` = the count after the previous task + 1, 0 fail, 1 skipped.

---

### Task 28 (DC-1): DESIGN.md says phase 2D is done and describes the guards by their EXEMPT lists (`DESIGN.md`)

Spec §1 point 5, §6 (`DESIGN.md:195`, `:260`, `:354`/`:356`, `:374-375`, `:398`, `:603` at `71597e5`: `:354`/`:356` and `:398` are already true at `388d4d5`, `:374-375` are `:376-377` now and `:603` is `:606`), §8 ruling 1, D1, D2, D13, D14 and the user's answers. Twenty-three exact replacements on 20 lines: the overview reaches phases 2B, 2C and 2D and names the guard lock and the three `phase 3` places (D1); the five new guards each get one sentence where their rule lives (raw colors D2, `disabled:opacity-*` D9, raw `<button>` D11, `border-dashed` D14, heights at `sm:` D23); every "per-file budget", "may only go down", `KEEP`, `MIGRATED_FILTER_FILES` and "ratchet" sentence becomes the `EXEMPT` / `OWNERS` format (D4, D5, D8, D12, D17, D18, D20–D22); the stale-promise sentences go (D3, D6, D11, D18, D22); GB3, GD2 and LK1 are named as they are (D10, D13, D15); the two-line `StatStrip` foot and the 44px help trigger (D16, D19); codes inside translated sentences wait for phase 3 (D7). The frontmatter, §2 tokens, every number the code does not change and every other section stay. DESIGN.md gives numbers only where spec §5.3 fixes them (DC-R2).

**Files:**
- Modify: `DESIGN.md` (`i/lf w/crlf`)
- Create: `tests/phase2d-docs.test.ts` (LF, new)

**Interfaces:** `tests/phase2d-docs.test.ts` defines `read(path)`, `STALE_2D` and `staleLines(path)` (file-local); DC-2 to DC-4 append tests that use them.

**Changes at `388d4d5`:**

| Id | Line | Section | Why |
|---|---|---|---|
| D1 | :195 | §1 Overview | the overview stops at 2C plan 1 (spec §6 :195); phases 2B and 2D and the guard lock are missing |
| D2 | :207 | §2 Colors | the raw-color guard (D14, spec §5.4 guard 1) |
| D3 | :260 | §2 Named Rules, the known exception | "until phase 2D" (past tense, but the phrase test reads it; spec §6 :260) |
| D4 | :266 | §2 The Token Contrast Rule | R1 and R7 are no ratchet any more (their lists are EXEMPT lists, both {}) |
| D5 | :285 | §3 Display | LH1 has no KEEP table any more |
| D6 | :302 | §3 Utilities, tag | "until 2D moves it" (0 class strings with font-mono and a bold weight in src at 388d4d5) |
| D7 | :302 | §3 Utilities, tag | codes inside translated sentences wait for phase 3 (the user, 2026-10-16) |
| D8 | :336 | §4 The Border First Rule | R2 as an EXEMPT list (spec §5.3: 7 permanent sites in 6 rows + 1 phase 3, 8 in 7 files at 388d4d5) |
| D9 | :372 | §5 Buttons, Disabled | the no-disabled:opacity guard (D14, spec §5.4 guard 4) |
| D10 | :373 | §5 Buttons, Busy | GB3 is the guard of K13 (spec §5.5) |
| D11 | :377 | §5 Buttons, Hand-written buttons | "until 2D moves them", "2D-5's OWNERS/EXEMPT lists" (spec §1 point 1, §5.2, D14 guard 3) |
| D12 | :378 | §5 Buttons, Order | GD4 per-file budget (0 flex-col-reverse in all of src at 388d4d5) |
| D13 | :407 | §5 Dialogs, AccessibleDialog parts | no dialog waits for the parts (FMG PENDING_FOOTER_PARTS is empty; 23 AccessibleDialog tags, each file with as many footers) |
| D14 | :437 | §5 Cards, Background | the border-dashed guard (D14, spec §5.4 guard 2; 2 in 2 files at 388d4d5: file-dropzone, signature-pad) |
| D15 | :442 | §5 KeyValueList | "after plan 2B-4 the last one is Info … (2D)" (0 LOCAL_KEY_VALUE functions in src at 388d4d5) |
| D16 | :443 | §5 StatStrip | the foot wraps to two lines (the user, 2026-10-17; the 2D-4 dev-app check found a cut foot on the audit rounds list at 375) |
| D17 | :467 | §5 Inputs, Migration | the fields left are GF2's EXEMPT rows (GF2 over all of src at 388d4d5: 4 outside the three primitives: label print 2, room picker 1, global search 1) |
| D18 | :467 | §5 Inputs, Migration | "no guard until 2D", MIGRATED_FILTER_FILES, "per-file budget … may only go down" (M18, M19) |
| D19 | :554 | §5 Asset register, filter sheet | the help trigger gets a 44px hit area on phones (the user, 2026-10-16) |
| D20 | :566 | Empty Values and Numbers | the KEEP word in the history sentence |
| D21 | :566 | Empty Values and Numbers | the "-" that stay are LV2's EXEMPT rows |
| D22 | :606 | §6 Don't | "hold what is left to its KEEP row, and phase 2D empties them" (spec §6 :603) |
| D23 | :623 | §7 Adaptive UI Contract | the no-height-at-sm guard (D14, spec §5.4 guard 5) |

The exact text (line numbers of `388d4d5`):

**(D1)** :195, §1 Overview: the overview stops at 2C plan 1 (spec §6 :195); phases 2B and 2D and the guard lock are missing. Replace:

```
Phase 2C (spec `docs/superpowers/specs/2026-10-11-ui-phase2c-design.md`) moves forms and dialogs onto those components in five batches. Phase 2C plan 1 adds `Segmented`, the dialog parts, `StickyFormFooter`, `Steps`, `FormSection`, `ChoiceCard`/`ChoiceChip` and `FileQueueList`, and moves the first 26 form and dialog files.
```

with

```
Phase 2B (spec `docs/superpowers/specs/2026-10-12-ui-phase2b-design.md`) moved the list pages and page frames onto `PageHeader`, `DataTable`, the filter parts, `RowActions`, `TabNav`, `StatStrip`, `KeyValueList` and `ContentPanel` in five plans, and phase 2C (spec `docs/superpowers/specs/2026-10-11-ui-phase2c-design.md`) the forms and dialogs in five batches, with `Segmented`, the dialog parts, `StickyFormFooter`, `Steps`, `FormSection`, `ChoiceCard`/`ChoiceChip`, `FileQueueList` and `ActionBar`. Phase 2D (spec `docs/superpowers/specs/2026-10-15-ui-phase2d-design.md`, five plans) moved what was left in `src` onto the same parts, added `Chip` and the `icon-lg` size, made the default button 36px and locked the guards: they read all of `src`, and each rule allows only the shared parts that own its pattern (`OWNERS`) and the sites of its `EXEMPT` list, each with its exact count, its reason, its ruling and its kind, `permanent` or `phase 3`. Five new guards cover raw colors, dashed borders, raw `<button>`s, faded disabled controls and button heights at `sm:`. The `phase 3` rows are the three places phase 3 reworks: the register's bulk selection bar, the login page frame and the topbar search.
```

**(D2)** :207, §2 Colors: the raw-color guard (D14, spec §5.4 guard 1). Replace:

```
`tests/design-tokens-contrast.test.ts` checks every pair.
```

with

```
`tests/design-tokens-contrast.test.ts` checks every pair. Screens use only these tokens: a guard (spec 2D §5.4) fails a raw palette class (`text-gray-*`, `bg-blue-*`, `slate`, `zinc` …) or a hex color in a class anywhere in `src`; what keeps its own colors is an `EXEMPT` row with its reason, such as the print paper and the camera imagery (plan 2D-4 R17).
```

**(D3)** :260, §2 Named Rules, the known exception: "until phase 2D" (past tense, but the phrase test reads it; spec §6 :260). Replace:

```
appeared teal until phase 2D moved them
```

with

```
appeared teal before phase 2D moved them
```

**(D4)** :266, §2 The Token Contrast Rule: R1 and R7 are no ratchet any more (their lists are EXEMPT lists, both {}). Replace:

```
the ratchet guards `R1 tone colors never fade with opacity`
```

with

```
the guards `R1 tone colors never fade with opacity`
```

**(D5)** :285, §3 Display: LH1 has no KEEP table any more. Replace:

```
(guard LH1 `KEEP`)
```

with

```
(guard LH1 `EXEMPT`)
```

**(D6)** :302, §3 Utilities, tag: "until 2D moves it" (0 class strings with font-mono and a bold weight in src at 388d4d5). Replace:

```
Never bold (Plex Mono loads 400 and 500 only; a leftover `font-mono font-semibold` gets a synthesized bold until 2D moves it to `tag`; the row's own id is `tag font-medium text-foreground`)
```

with

```
Never bold (Plex Mono loads 400 and 500 only, so a bold weight is synthesized; phase 2D moved the last `font-mono font-semibold` codes to `tag`; the row's own id is `tag font-medium text-foreground`)
```

**(D7)** :302, §3 Utilities, tag: codes inside translated sentences wait for phase 3 (the user, 2026-10-16). Replace:

```
styling them needs a markup tag in the messages, which phase 2D does not add.
```

with

```
styling them needs a markup tag in the messages, which waits for phase 3 (the user, 2026-10-16).
```

**(D8)** :336, §4 The Border First Rule: R2 as an EXEMPT list (spec §5.3: 7 permanent sites in 6 rows + 1 phase 3, 8 in 7 files at 388d4d5). Replace:

```
holds these 8 in a per-file budget that may only go down.
```

with

```
holds exactly these 8 in its `EXEMPT` list (spec 2D §5.1): 7 `permanent` and the register's bulk-action bar `phase 3`. Any other shadow fails, and so does a row whose shadow is gone.
```

**(D9)** :372, §5 Buttons, Disabled: the no-disabled:opacity guard (D14, spec §5.4 guard 4). Replace:

```
never faded with opacity.
```

with

```
never faded with opacity (a guard allows no `disabled:opacity-*` in `src`, spec 2D §5.4).
```

**(D10)** :373, §5 Buttons, Busy: GB3 is the guard of K13 (spec §5.5). Replace:

```
phase 2C ruling K13)
```

with

```
phase 2C ruling K13, guard GB3)
```

**(D11)** :377, §5 Buttons, Hand-written buttons: "until 2D moves them", "2D-5's OWNERS/EXEMPT lists" (spec §1 point 1, §5.2, D14 guard 3). Replace:

```
- **Hand-written buttons** keep their own classes until 2D moves them (phase 2B moved the header, filter, row and pager buttons of every page it moved; plan 2D-1 the readiness links; plan 2D-2 the topbar and sidebar buttons, the report and work-center links, the storage archive button and the two floating create buttons, which are `PageHeader` actions now; plan 2D-3 the asset page's quick actions, where one the asset cannot take is a disabled `Button`, the attachment, purchase-document and import buttons, and the master-data drill-down links; plan 2D-4 the field audit scanner's commands (the camera toggle in `SearchField`'s `trailing` slot, show-more, a busy "ส่งตอนนี้", "แก้" and the photo retry), the round close button (`busy`), the disposal evidence, asset picker and bulk retry buttons, the repair attachment buttons and the print documents' back and print buttons; the raw `<button>`s that stay carry a comment for 2D-5's `OWNERS`/`EXEMPT` lists: the scanner's whole-row buttons, the room picker's trigger and options, the camera controls over the image, the disposal asset picker's options and the repair attachment thumbnail); phase 2C batch 1 moved the form and dialog buttons of its 26 files (all but the repair attachment delete dialog, which batch 5 turned into `useConfirm`). Pick the size from today's desktop height:
```

with

```
- **Hand-written buttons:** phases 2B, 2C and 2D moved them onto `Button` and `buttonVariants`. Phase 2B moved the header, filter, row and pager buttons of every page it moved and phase 2C the form and dialog buttons of its files (batch 5 turned the repair attachment delete dialog into `useConfirm`); plan 2D-1 the readiness links; plan 2D-2 the topbar and sidebar buttons, the report and work-center links, the storage archive button and the two floating create buttons, now `PageHeader` actions; plan 2D-3 the asset page's quick actions (one the asset cannot take is a disabled `Button`), the attachment, purchase-document and import buttons and the master-data drill-down links; plan 2D-4 the field audit scanner's commands (the camera toggle sits in `SearchField`'s `trailing` slot), the round close button and the disposal, repair and print-document buttons. A raw `<button>` stays only in a shared part that owns it (the guard's `OWNERS`, spec 2D §5.2) or at a site of the guard's `EXEMPT` list (spec 2D §5.1), such as a row, option or thumbnail that is itself the control, or a control drawn over the camera image. To move one, pick the size from its desktop height:
```

**(D12)** :378, §5 Buttons, Order: GD4 per-file budget (0 flex-col-reverse in all of src at 388d4d5). Replace:

```
Guard GD4 holds the remaining `flex-col-reverse` lines in a per-file budget.
```

with

```
Guard GD4 allows no `flex-col-reverse` in `src` (none is left).
```

**(D13)** :407, §5 Dialogs, AccessibleDialog parts: no dialog waits for the parts (FMG PENDING_FOOTER_PARTS is empty; 23 AccessibleDialog tags, each file with as many footers). Replace:

```
(guard GD6). A dialog that has not moved to the parts yet scrolls as before.
```

with

```
(guard GD6). Every `AccessibleDialog` in `src` has its footer part (guard GD2); none waits for the parts any more.
```

**(D14)** :437, §5 Cards, Background: the border-dashed guard (D14, spec §5.4 guard 2; 2 in 2 files at 388d4d5: file-dropzone, signature-pad). Replace:

```
Empty states have no box of their own (see Feedback).
```

with

```
Empty states have no box of their own (see Feedback), and only the shared parts that draw one have a dashed border (`FileDropzone`, the `SignaturePad` canvas; guard, spec 2D §5.4).
```

**(D15)** :442, §5 KeyValueList: "after plan 2B-4 the last one is Info … (2D)" (0 LOCAL_KEY_VALUE functions in src at 388d4d5). Replace:

```
Guard LK1 allows no local `Info`, `InfoRow` or `DetailItem` helper; after plan 2B-4 the last one is `Info` in `asset-movement-timeline.tsx` (2D).
```

with

```
Guard LK1 allows no local label-and-value helper anywhere in `src`: `Info`, `InfoRow`, `DetailItem` and every look-alike a later plan removed are named in its `LOCAL_KEY_VALUE`, and none is left.
```

**(D16)** :443, §5 StatStrip: the foot wraps to two lines (the user, 2026-10-17; the 2D-4 dev-app check found a cut foot on the audit rounds list at 375). Replace:

```
an optional faint foot line;
```

with

```
an optional faint foot of at most two lines (longer text ends in an ellipsis and `footTitle` gives the whole of it; plan 2D-5);
```

**(D17)** :467, §5 Inputs, Migration: the fields left are GF2's EXEMPT rows (GF2 over all of src at 388d4d5: 4 outside the three primitives: label print 2, room picker 1, global search 1). Replace:

```
The 3 hand-written fields left stay on purpose: the 2 boxed fields of the label-print toolbar (the box, not the control, takes the field border, the white fill, 16px text below `md` and the field's focus look through `focus-within:`, phase 2C ruling K21) and the room search of the audit room picker.
```

with

```
The hand-written fields left stay on purpose as the rows of GF2's `EXEMPT` list: the 2 boxed fields of the label-print toolbar (the box, not the control, takes the field border, the white fill, 16px text below `md` and the field's focus look through `focus-within:`, phase 2C ruling K21) and the room search of the audit room picker (O20), all `permanent`, and the topbar search (`phase 3`).
```

**(D18)** :467, §5 Inputs, Migration: "no guard until 2D", MIGRATED_FILTER_FILES, "per-file budget … may only go down" (M18, M19). Replace:

```
`tests/list-filters-ui.test.ts` holds 13 filter files to the shared fields (`MIGRATED_FILTER_FILES`: every `src/app` page that had a raw filter field, the master-data search, the report filter panel and the data-quality review queue); a raw field in a filter form outside the list has no guard until 2D (spec 2B I34). `tests/form-migration-guards.test.ts` keeps a per-file budget of every old pattern (GF2 counts hand-written fields) that may only go down.
```

with

```
Since plan 2D-5 `tests/list-filters-ui.test.ts` holds every filter form in `src` to the shared fields (spec 2B I34, 2D M19; its list of 13 files is gone), and `tests/form-migration-guards.test.ts` counts every old pattern over all of `src` (GF2 counts hand-written fields; spec 2D M18): outside a rule's `OWNERS`, a file keeps only the sites of its `EXEMPT` list, exactly.
```

**(D19)** :554, §5 Asset register, filter sheet: the help trigger gets a 44px hit area on phones (the user, 2026-10-16). Replace:

```
status and condition carry their 24px help button in `labelAction`.
```

with

```
status and condition carry their 24px help button in `labelAction` (44px to tap below `md`, plan 2D-5).
```

**(D20)** :566, Empty Values and Numbers: the KEEP word in the history sentence. Replace:

```
every one a `KEEP` row for phase 2D
```

with

```
every one kept by phase 2B for phase 2D
```

**(D21)** :566, Empty Values and Numbers: the "-" that stay are LV2's EXEMPT rows. Replace:

```
Print pages, PDFs and label data keep `"-"`.
```

with

```
Print pages, PDFs, label data and the arguments of translated sentences keep `"-"` (2B R-n); every typed `"-"` that stays is a `permanent` row of LV2's `EXEMPT` list (plan 2D-5).
```

**(D22)** :606, §6 Don't: "hold what is left to its KEEP row, and phase 2D empties them" (spec §6 :603). Replace:

```
: since plan 2B-5 the list-frame guards (`tests/list-frame-guards.test.ts`, LH1 to LR1) hold what is left to its `KEEP` row, and phase 2D empties them.
```

with

```
: the list-frame guards (`tests/list-frame-guards.test.ts`, LH1 to LR1) allow only their shared parts (`OWNERS`) and the sites of their `EXEMPT` lists (since plan 2D-5).
```

**(D23)** :623, §7 Adaptive UI Contract: the no-height-at-sm guard (D14, spec §5.4 guard 5). Replace:

```
Shared buttons, fields and menu items switch to their desktop height at `md` (768px), not `sm`.
```

with

```
Shared buttons, fields and menu items switch to their desktop height at `md` (768px), not `sm`, and no button or button-like link sets a height of its own at `sm:` (guard, spec 2D §5.4).
```

- [ ] **Step 1: The failing test.** Create `tests/phase2d-docs.test.ts` (LF) with exactly:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-5 (spec 2D §1 point 5, §6): the design docs say what the code does after phase 2D. No sentence may still
// wait for phase 2D ("until 2D", "2D moves", "waits for 2D-5"), and the guards are described by their EXEMPT and
// OWNERS lists (spec 2D §5.1, §5.2), not by budgets that go down. DEVELOPER_HANDOFF.md and docs/99_CHANGELOG.md are
// dated history, so the phrase check reads only DESIGN.md, docs/14 and .impeccable/design.json. One test per docs
// commit; each fails before its commit. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

const STALE_2D = [
  /\buntil (?:phase )?2D\b/i,
  /\b2D moves?\b/i,
  /\bphase 2D (?:sets|empties|widens|moves?)\b/i,
  /\b2D-5's\b/,
  /\bwaits? for (?:plan )?2D-5\b/i,
  /\b2D-4 and 2D-5 (?:still )?(?:move|own)\b/i,
]
const staleLines = (path: string) =>
  read(path)
    .split("\n")
    .flatMap((line, index) => STALE_2D.filter((pattern) => pattern.test(line)).map((pattern) => `${path}:${index + 1} ${pattern}`))

test("DESIGN.md: nothing waits for phase 2D, and the guards are their EXEMPT lists (plan 2D-5, spec 2D §1 point 5)", () => {
  assert.deepEqual(staleLines("DESIGN.md"), [])
  const design = read("DESIGN.md")
  assert.doesNotMatch(design, /per-file budget|may only go down|`KEEP`|MIGRATED_FILTER_FILES|ratchet guards|has not moved to the parts yet/, "since plan 2D-5 every rule holds an exact EXEMPT list")
  assert.match(design, /Phase 2D \(spec `docs\/superpowers\/specs\/2026-10-15-ui-phase2d-design\.md`/, "the overview reaches phase 2D")
  assert.match(design, /the register's bulk selection bar, the login page frame and the topbar search/, "the three phase 3 places (D2)")
  assert.match(design, /holds exactly these 8 in its `EXEMPT` list/, "§4: the shadows that stay")
  assert.match(design, /fails a raw palette class/, "§2: the raw-color guard")
  assert.match(design, /A raw `<button>` stays only in a shared part that owns it \(the guard's `OWNERS`/, "§5: the raw button guard")
  assert.match(design, /no `disabled:opacity-\*` in `src`/)
  assert.match(design, /only the shared parts that draw one have a dashed border/)
  assert.match(design, /sets a height of its own at `sm:`/)
  assert.match(design, /Every `AccessibleDialog` in `src` has its footer part \(guard GD2\)/)
  assert.match(design, /holds every filter form in `src` to the shared fields/, "M19")
  assert.match(design, /\(guard LH1 `EXEMPT`\)/)
  assert.match(design, /an optional faint foot of at most two lines/, "StatStrip: the foot wraps to two lines before its ellipsis")
  assert.match(design, /24px help button in `labelAction` \(44px to tap below `md`/, "the help trigger's hit area on phones")
  assert.match(design, /which waits for phase 3 \(the user, 2026-10-16\)/, "codes inside translated sentences")
})
```

  No existing assertion changes: no test reads `DESIGN.md` (`grep -rln "DESIGN.md" tests` finds comments only).
- [ ] **Step 2: Watch it fail.** `node --test tests/phase2d-docs.test.ts`. Expected to fail: "DESIGN.md: nothing waits for phase 2D, and the guards are their EXEMPT lists (plan 2D-5, spec 2D §1 point 5)", its first assertion listing 8 entries: `DESIGN.md:260`, `:302` (2), `:377` (3), `:467` and `:606`.
- [ ] **Step 3: Implement** D1–D23 with exact-string replacements (Edit, one old text each).
  Then check the facts the new sentences state, in the working tree after the code and guard tasks of this plan (Git Bash, from the repo root). If one fails, stop and report: the sentence and the code disagree, and the controller decides which changes.
  - `grep -rn "disabled:opacity-" src` → nothing (D9).
  - `grep -rln "border-dashed" src` → `src/components/ui/file-dropzone.tsx` and `src/components/asset-operations/signature-pad.tsx` only (D14).
  - `grep -rn "flex-col-reverse" src` → nothing (D12).
  - `grep -rnE '"[^"]*\bfont-mono\b[^"]*\bfont-(semibold|bold)\b|"[^"]*\bfont-(semibold|bold)\b[^"]*\bfont-mono\b' src` → nothing (D6).
  - `grep -rnE "sm:(min-)?(h|w)-" src/components/auth/login-form.tsx` → nothing (D23: the one site of `388d4d5` has moved; the new guard itself passes in `npm test`).
  - `grep -n "footTitle" src/components/ui/stat-strip.tsx` → the prop and its `title`, and the foot's class string holds a two-line clamp (D16); `src/components/assets/asset-state-help-popover.tsx` gives its trigger a 44px hit area below `md` (D19); `grep -n 'kind: "phase 3"' tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts` lists rows of the three D2 places only (D1).
- [ ] **Step 4: Guard edits:** none.
- [ ] **Step 5: Verify.** `node --test tests/phase2d-docs.test.ts` (1/1); `node <tools>/eol.mjs DESIGN.md` → `637 637` (the line count does not change); `git add -N tests/phase2d-docs.test.ts && git diff --numstat` → `20 20 DESIGN.md` and `43 0 tests/phase2d-docs.test.ts` (plain `git diff` leaves out the new untracked file; `git add -N` makes it show); `npm test` (+1 test: 2185 tests, 2184 pass, 0 fail, 1 skipped); `npx tsc --noEmit` (tests are type-checked); `npm run lint` (0 errors, no new warning in `src/` or `tests/`).
- [ ] **Step 6: Commit.** `git add DESIGN.md tests/phase2d-docs.test.ts` then `git commit -m "docs(ui): DESIGN.md says phase 2D is done and describes the guards by their EXEMPT lists (2D-5 task 28, DC-1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 29 (DC-2): The design-system index describes the EXEMPT guards and registers the phase 2D spec (`docs/14_UI_UX_DESIGN_SYSTEM.md`)

Spec §6 (`docs/14_UI_UX_DESIGN_SYSTEM.md:98` at `71597e5`, `:99` now), §8 ruling 1, D13, D14 and the user's two-line foot. The guard paragraph under Shared Components says what the guards hold since plan 2D-5 (X3); the Button row gains guards 3 to 5 of spec §5.4 (X1) and the `StatStrip` row the two-line foot (X2); the Current-Surface Registry gets the row of the phase 2D spec, which its Change Maintenance rule (`:137`) asks for in the commit that adds a spec and which plans 2D-1 to 2D-4 never added (X4, DC-R5). Every other row and section stays.

**Files:**
- Modify: `docs/14_UI_UX_DESIGN_SYSTEM.md` (`i/lf w/crlf`)
- Test (append): `tests/phase2d-docs.test.ts` (LF)

**Changes at `388d4d5`:**

| Id | Line | Section | Why |
|---|---|---|---|
| X1 | :57 | Shared Components, the Button row | guards 3, 4 and 5 of spec §5.4 |
| X2 | :82 | Shared Components, the StatStrip row | the two-line foot |
| X3 | :99 | the guard paragraph | "phase 2D move the rest", ratchet, per-file budgets, KEEP, "phase 2D sets every budget to {}" (spec §6 docs/14:98, §8 ruling 1) |
| X4 | :121 | Current-Surface Registry | phase 2D was never registered (Change Maintenance: register a focused spec in the commit that adds it) |

**(X1)** :57, Shared Components, the Button row: guards 3, 4 and 5 of spec §5.4. Replace:

```
`lg` / `icon-lg` (40px) only beside a 40px field |
```

with

```
`lg` / `icon-lg` (40px) only beside a 40px field; a raw `<button>` only in a shared part or an `EXEMPT` row, never a height of its own at `sm:` and never `disabled:opacity-*` (guards, spec 2D §5.4) |
```

**(X2)** :82, Shared Components, the StatStrip row: the two-line foot. Replace:

```
values already formatted and counted over the whole filtered list; no tone fill;
```

with

```
values already formatted and counted over the whole filtered list; a foot wraps to two lines at most, then ends in an ellipsis (`footTitle` holds the whole text); no tone fill;
```

**(X3)** :99, the guard paragraph: "phase 2D move the rest", ratchet, per-file budgets, KEEP, "phase 2D sets every budget to {}" (spec §6 docs/14:98, §8 ruling 1). Replace:

```
Phase 2A built the first set, phase 2C plan 1 added the form and dialog pieces (and plan 5 `ActionBar`), and phase 2B plan 1 added the list and page-frame pieces; phase 2B moved the list pages and page frames onto them (complete since plan 2B-5), and the last 2C batch and phase 2D move the rest. The ratchet guards in `tests/visual-foundation-guards.test.ts`, for forms and dialogs `tests/form-migration-guards.test.ts`, and for list pages and page frames `tests/list-frame-guards.test.ts` let their per-file budgets go down, never up; since plan 2B-5 the list-frame budgets equal what may stay after 2B (`KEEP`, test L9) and R7 checks every line, and phase 2D sets every budget to `{}`.
```

with

```
Phase 2A built the first set, phase 2C plan 1 added the form and dialog pieces (and plan 5 `ActionBar`), phase 2B plan 1 the list and page-frame pieces and phase 2D plan 2 `Chip`; phases 2B, 2C and 2D moved every screen in `src` onto them. The guards in `tests/visual-foundation-guards.test.ts`, for forms and dialogs `tests/form-migration-guards.test.ts`, and for list pages and page frames `tests/list-frame-guards.test.ts` read all of `src` and hold what may stay since plan 2D-5: each rule allows only the shared parts that own its pattern (`OWNERS`) and the sites of its `EXEMPT` list, where a row gives the file, the exact count, `why`, `ruling` and its kind, `permanent` or `phase 3` (spec 2D §5.1, checked by `exemptProblems` in `tests/helpers/guard-exempt.ts`). A count above or below its row fails, so the commit that moves a site lowers or deletes its row, and a test lists the `phase 3` rows that phase 3 must clear. Five guards of plan 2D-5 (spec 2D §5.4) keep raw colors, dashed borders outside the shared parts, raw `<button>`s, faded disabled controls and button heights at `sm:` out of `src`, apart from their `EXEMPT` rows.
```

**(X4)** :121, Current-Surface Registry: phase 2D was never registered (Change Maintenance: register a focused spec in the commit that adds it). Replace:

```
| Cross-cutting UI hardening | [`2026-07-10-ui-ux-hardening-design.md`]
```

with

```
| The remaining screens and the guard lock | [`2026-10-15-ui-phase2d-design.md`](superpowers/specs/2026-10-15-ui-phase2d-design.md) (UI round 4 phase 2D: every hand-written UI left in `src` on the shared parts, `Chip`, the `icon-lg` size and the 36px default button; the guards locked to exact `EXEMPT` and `OWNERS` lists, and five new guards over all of `src`; its §2 rulings D0–D19) | [`2026-10-15-ui-phase2d-plan1.md`](superpowers/plans/2026-10-15-ui-phase2d-plan1.md) sequences plan 2D-1 (the button sizes, `status.name` in the search API and the dead code); [`2026-10-15-ui-phase2d-plan2.md`](superpowers/plans/2026-10-15-ui-phase2d-plan2.md) plan 2D-2 (the admin pages, reports, dashboard, work center and shell); [`2026-10-16-ui-phase2d-plan3.md`](superpowers/plans/2026-10-16-ui-phase2d-plan3.md) plan 2D-3 (the asset pages and tools and the master data); [`2026-10-16-ui-phase2d-plan4.md`](superpowers/plans/2026-10-16-ui-phase2d-plan4.md) plan 2D-4 (audit, disposal, maintenance and the asset transactions); [`2026-10-17-ui-phase2d-plan5.md`](superpowers/plans/2026-10-17-ui-phase2d-plan5.md) plan 2D-5 (the guard lock and the last docs), the last plan of phase 2D. |
| Cross-cutting UI hardening | [`2026-07-10-ui-ux-hardening-design.md`]
```

X4 inserts one table row above the "Cross-cutting UI hardening" row (its old text is that row's start, kept as the last line of the new text). The plan 5 link is this plan's own file: if the plan is saved under another name, change both the link text and its target.

- [ ] **Step 1: The failing test.** Append to `tests/phase2d-docs.test.ts`:

```ts

test("docs/14: the guard paragraph names OWNERS and EXEMPT, and the registry lists phase 2D (plan 2D-5)", () => {
  assert.deepEqual(staleLines("docs/14_UI_UX_DESIGN_SYSTEM.md"), [])
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  assert.doesNotMatch(index, /per-file budgets|`KEEP`|sets every budget|ratchet guards in/)
  assert.match(index, /each rule allows only the shared parts that own its pattern \(`OWNERS`\) and the sites of its `EXEMPT` list/)
  assert.match(index, /`exemptProblems` in `tests\/helpers\/guard-exempt\.ts`/)
  assert.match(index, /\n\| [^|\n]+ \| \[`2026-10-15-ui-phase2d-design\.md`\]\(superpowers\/specs\/2026-10-15-ui-phase2d-design\.md\)/, "Current-Surface Registry: the phase 2D row")
  assert.match(index, /never a height of its own at `sm:` and never `disabled:opacity-\*`/, "the Button row")
  assert.match(index, /a foot wraps to two lines at most/, "the StatStrip row")
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/phase2d-docs.test.ts`. Expected to fail: "docs/14: the guard paragraph names OWNERS and EXEMPT, and the registry lists phase 2D (plan 2D-5)" (`docs/14_UI_UX_DESIGN_SYSTEM.md:99` twice). The DC-1 test passes.
- [ ] **Step 3: Implement** X1–X4 with exact-string replacements.
- [ ] **Step 4: Guard edits:** none.
- [ ] **Step 5: Verify.** `node --test tests/phase2d-docs.test.ts` (2/2); `node <tools>/eol.mjs docs/14_UI_UX_DESIGN_SYSTEM.md` → `138 138` (one row added); `git diff --numstat` → `4 3 docs/14_UI_UX_DESIGN_SYSTEM.md` and `11 0 tests/phase2d-docs.test.ts`; `npm test` (+1: 2186 tests, 2185 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`).
- [ ] **Step 6: Commit.** `git add docs/14_UI_UX_DESIGN_SYSTEM.md tests/phase2d-docs.test.ts` then `git commit -m "docs(ui): the design-system index describes the EXEMPT guards and registers the phase 2D spec (2D-5 task 29, DC-2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 30 (DC-3): .impeccable/design.json follows the code after phase 2D (`.impeccable/design.json`)

Spec §6 (`.impeccable/design.json`: the info teal "until 2D" `:499`, the table shell `:544`, the 40px buttons `:355`, `:363`, `:403`, the 2B parts), handed on by DH 2D-1 ("`.impeccable/design.json` button heights"), 2D-2, 2D-3 and 2D-4. The file is the hand-kept mirror of `DESIGN.md` that the impeccable skill reads (DC-R4). Its css examples take the sizes of `c/ui/button-variants.ts` (`default` = `md`: 44px below 768px, 36px from 768px, 14px side padding; `icon` 36px; fields stay 40px, D4) and the font stack of `src/app/layout.tsx`; the info-teal note and the shadow guard follow `DESIGN.md` §2 and §4; `dos[0]` and two new `donts` follow `DESIGN.md` §6 (`:584`, `:604`, `:606` after DC-1); the `StatStrip` foot clamps at two lines. JSON stays valid, 2-space indented, LF, one line per string; `colorMeta`, `typographyMeta`, `shadows`, `motion`, `breakpoints`, every `html` example and every other component and rule stay.

**Files:**
- Modify: `.impeccable/design.json` (`i/lf w/lf`, tracked)
- Test (append): `tests/phase2d-docs.test.ts` (LF)

**Changes at `388d4d5`:**

| Id | Line | Section | Why |
|---|---|---|---|
| J1 | :3 | generatedAt | the file changes in this commit |
| J2 | :355 | Primary Button css | md padding 14px (button-variants.ts:8 sizeMd px-3.5) |
| J3 | :355 | Primary Button css | 40px → 36px from 768px (spec §6 :355, D3) |
| J4 | :363 | Secondary Button css | md padding 14px |
| J5 | :363 | Secondary Button css | 40px → 36px (spec §6 :363) |
| J6 | :403 | Dialog css | footer button md padding 14px |
| J7 | :403 | Dialog css | the X (ghost icon, button-variants.ts:11 sizeIcon) and the footer buttons 36px from 768px (spec §6 :403) |
| J8 | 20 css strings | every css font stack | the Thai font of the code since 2026-10-16 (src/app/layout.tsx Noto_Sans_Thai_Looped; typographyMeta already says so) |
| J9 | :457 | Stat Strip description | the two-line foot |
| J10 | :459 | Stat Strip css | the foot clamps at two lines |
| J11 | :499 | The Where Color Lives Rule | "Until phase 2D" (spec §6 :499) |
| J12 | :534 | The Border First Rule | "a per-file budget guard" |
| J13 | :544 | dos[0] | the "table shell" helper (getTableShellClasses was deleted in 2D-1) and the 2B and 2D parts missing (spec §6), as DESIGN.md §6 Do |
| J14 | :562 | donts | the disabled-opacity Don't of DESIGN.md §6 (:604), before the busy-label one |
| J15 | :562 | donts | the list-frame Don't of DESIGN.md §6 (:606 after DC-1), last |

**(J1)** :3, generatedAt: the file changes in this commit. Replace:

```
"generatedAt": "2026-10-13T00:00:00+07:00",
```

with

```
"generatedAt": "<today>T00:00:00+07:00",
```

**(J2)** :355, Primary Button css: md padding 14px (button-variants.ts:8 sizeMd px-3.5). Replace:

```
.ds-btn-primary { min-height: 44px; padding: 0 16px;
```

with

```
.ds-btn-primary { min-height: 44px; padding: 0 14px;
```

**(J3)** :355, Primary Button css: 40px → 36px from 768px (spec §6 :355, D3). Replace:

```
@media (min-width: 768px) { .ds-btn-primary { min-height: 0; height: 40px; } }
```

with

```
@media (min-width: 768px) { .ds-btn-primary { min-height: 0; height: 36px; } }
```

**(J4)** :363, Secondary Button css: md padding 14px. Replace:

```
.ds-btn-secondary { min-height: 44px; padding: 0 16px;
```

with

```
.ds-btn-secondary { min-height: 44px; padding: 0 14px;
```

**(J5)** :363, Secondary Button css: 40px → 36px (spec §6 :363). Replace:

```
@media (min-width: 768px) { .ds-btn-secondary { min-height: 0; height: 40px; } }
```

with

```
@media (min-width: 768px) { .ds-btn-secondary { min-height: 0; height: 36px; } }
```

**(J6)** :403, Dialog css: footer button md padding 14px. Replace:

```
.ds-dialog-btn { min-height: 44px; padding: 0 16px;
```

with

```
.ds-dialog-btn { min-height: 44px; padding: 0 14px;
```

**(J7)** :403, Dialog css: the X (ghost icon, button-variants.ts:11 sizeIcon) and the footer buttons 36px from 768px (spec §6 :403). Replace:

```
@media (min-width: 768px) { .ds-dialog-x { width: 40px; height: 40px; } .ds-dialog-btn { min-height: 0; height: 40px; } }
```

with

```
@media (min-width: 768px) { .ds-dialog-x { width: 36px; height: 36px; } .ds-dialog-btn { min-height: 0; height: 36px; } }
```

**(J8)** 20 css strings, every css font stack: the Thai font of the code since 2026-10-16 (src/app/layout.tsx Noto_Sans_Thai_Looped; typographyMeta already says so). Replace all 20 (Edit with `replace_all`):

```
\"IBM Plex Sans Thai\"
```

with

```
\"Noto Sans Thai Looped\"
```

**(J9)** :457, Stat Strip description: the two-line foot. Replace:

```
and an optional faint foot line.
```

with

```
and an optional faint foot of at most two lines, which then ends in an ellipsis (its title holds the whole text).
```

**(J10)** :459, Stat Strip css: the foot clamps at two lines. Replace:

```
.ds-stat-foot { font-size: 13px; line-height: 1.5385; color: #56677F; }
```

with

```
.ds-stat-foot { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; font-size: 13px; line-height: 1.5385; color: #56677F; }
```

**(J11)** :499, The Where Color Lives Rule: "Until phase 2D" (spec §6 :499). Replace:

```
Until phase 2D, info notices, role chips and a few info icons also use the info tokens and so appear teal (phase 2A changed only their borders).
```

with

```
Names are the neutral Chip, states StatusBadge and notes Notice by meaning, so outside the shared parts (the info status ring and the info Notice icon) no screen uses the info tokens (phase 2D).
```

**(J12)** :534, The Border First Rule: "a per-file budget guard". Replace:

```
Six shadow-sm stay on controls over a camera image or photo and on paper previews; a per-file budget guard keeps the rest from coming back.
```

with

```
Six shadow-sm stay on controls over a camera image or photo and on paper previews, and two larger shadows on the round scan button and the register's phone bulk-action bar (phase 3); a guard holds exactly these 8 in its EXEMPT list.
```

**(J13)** :544, dos[0]: the "table shell" helper (getTableShellClasses was deleted in 2D-1) and the 2B and 2D parts missing (spec §6), as DESIGN.md §6 Do. Replace:

```
the dialog parts (AccessibleDialogBody, AccessibleDialogFooter, AccessibleDialogCancel), StickyFormFooter, ChoiceCard and ChoiceChip, Steps, FormSection, FileQueueList, Notice, EmptyNote, ActionEmptyState, and the panel, table shell and mobile card list helpers.
```

with

```
the dialog parts (AccessibleDialogBody, AccessibleDialogFooter, AccessibleDialogCancel) and useConfirm, StickyFormFooter and ActionBar, ChoiceCard and ChoiceChip, Chip, Steps, FormSection, FileQueueList, Notice, EmptyNote, ActionEmptyState, PageHeader and PageBackLink, DataTable with TableEmptyRow and Pagination, FilterSelect, FilterFormActions and FilterChipList, RowActions, TabNav, StatStrip, KeyValueList, ContentPanel divided, Nil, formatCount and formatMoney, the loading skeletons of page-skeleton.tsx, and the panel and mobile card list helpers.
```

**(J14)** :562, donts: the disabled-opacity Don't of DESIGN.md §6 (:604), before the busy-label one. Replace:

```
"Don't change a button's label while it is busy,
```

with

```
"Don't fade a disabled control with opacity, put faint text on a status soft fill, or tint a fill or border with /NN; use the disabled look, the tone ink and the solid tokens.",
      "Don't change a button's label while it is busy,
```

**(J15)** :562, donts: the list-frame Don't of DESIGN.md §6 (:606 after DC-1), last. Replace:

```
or give a dialog its own form when it renders inside another form."
```

with

```
or give a dialog its own form when it renders inside another form.",
      "Don't write a page title, table head, sort header, empty row, pager, filter select, number box or label and value helper of your own, or bring back MetricCard, ReportHeader or MasterDataHeader: the list-frame guards (tests/list-frame-guards.test.ts, LH1 to LR1) allow only their shared parts (OWNERS) and the sites of their EXEMPT lists."
```

In J1 replace `<today>` with today's date (`YYYY-MM-DD`). J8's old and new texts are as the file stores them, with a backslash before each quote. J14 and J15 add one line each to `narrative.donts`; their new text keeps the six-space indent of the array items.

- [ ] **Step 1: The failing test.** Append to `tests/phase2d-docs.test.ts`:

```ts

test(".impeccable/design.json: valid LF JSON whose examples match the code after phase 2D (plan 2D-5)", () => {
  const raw = readFileSync(".impeccable/design.json", "utf8")
  assert.equal(raw.includes("\r"), false, "the file stays LF")
  type Design = {
    components: Array<{ name: string; description: string; css: string }>
    narrative: { rules: Array<{ name: string; body: string }>; dos: string[]; donts: string[] }
  }
  const design = JSON.parse(raw) as Design
  assert.deepEqual(staleLines(".impeccable/design.json"), [])
  assert.doesNotMatch(raw, /IBM Plex Sans Thai|table shell|per-file budget/)
  const component = (name: string) => design.components.find((entry) => entry.name === name) ?? { name, description: "", css: "" }
  for (const [name, cls] of [["Primary Button", "ds-btn-primary"], ["Secondary Button", "ds-btn-secondary"]]) {
    assert.match(component(name).css, new RegExp(`\\.${cls} \\{ min-height: 44px; padding: 0 14px;`), `${name}: 44px below 768px, 14px padding`)
    assert.match(component(name).css, new RegExp(`@media \\(min-width: 768px\\) \\{ \\.${cls} \\{ min-height: 0; height: 36px; \\} \\}`), `${name}: 36px from 768px (spec 2D D3)`)
  }
  assert.match(component("Dialog").css, /@media \(min-width: 768px\) \{ \.ds-dialog-x \{ width: 36px; height: 36px; \} \.ds-dialog-btn \{ min-height: 0; height: 36px; \} \}/)
  for (const entry of design.components) {
    // Only fields stay 40px from 768px (2C K7, spec 2D D4).
    if (entry.name !== "Text Field") assert.doesNotMatch(entry.css, /\b(?:height|width): 40px/, entry.name)
    if (/"IBM Plex Sans"/.test(entry.css)) assert.match(entry.css, /"IBM Plex Sans", "Noto Sans Thai Looped", system-ui, sans-serif/, `${entry.name}: the Thai font of src/app/layout.tsx`)
  }
  assert.match(component("Stat Strip").description, /foot of at most two lines/)
  assert.match(component("Stat Strip").css, /\.ds-stat-foot \{[^}]*-webkit-line-clamp: 2;/)
  const rule = (name: string) => design.narrative.rules.find((entry) => entry.name === name)?.body ?? ""
  assert.match(rule("The Where Color Lives Rule"), /no screen uses the info tokens/)
  assert.match(rule("The Border First Rule"), /holds exactly these 8 in its EXEMPT list/)
  for (const part of ["Chip", "PageHeader", "DataTable", "StatStrip", "KeyValueList", "ContentPanel divided", "ActionBar"]) assert.ok(design.narrative.dos[0].includes(part), `dos[0] names ${part}`)
  assert.ok(design.narrative.donts.some((entry) => /^Don't fade a disabled control with opacity/.test(entry)))
  assert.ok(design.narrative.donts.some((entry) => /allow only their shared parts \(OWNERS\) and the sites of their EXEMPT lists\.$/.test(entry)))
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/phase2d-docs.test.ts`. Expected to fail: ".impeccable/design.json: valid LF JSON whose examples match the code after phase 2D (plan 2D-5)" (`.impeccable/design.json:499`). The DC-1 and DC-2 tests pass.
- [ ] **Step 3: Implement** J1–J15 (J8 with `replace_all`: `grep -o 'IBM Plex Sans Thai' .impeccable/design.json | wc -l` → 20 before, 0 after). Check the two sources first: `grep -n "const sizeMd\|const sizeIcon " src/components/ui/button-variants.ts` → `px-3.5 … md:h-9` and `md:size-9`; `grep -n "Noto_Sans_Thai_Looped" src/app/layout.tsx` → the import and the font. Then `node -e "JSON.parse(require('fs').readFileSync('.impeccable/design.json','utf8'))"` exits 0.
- [ ] **Step 4: Guard edits:** none.
- [ ] **Step 5: Verify.** `node --test tests/phase2d-docs.test.ts` (3/3); `node <tools>/eol.mjs .impeccable/design.json` → `0 567`; `git diff --numstat` → `25 23 .impeccable/design.json` and `31 0 tests/phase2d-docs.test.ts`; `npm test` (+1: 2187 tests, 2186 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`).
- [ ] **Step 6: Commit.** `git add .impeccable/design.json tests/phase2d-docs.test.ts` then `git commit -m "docs(ui): .impeccable/design.json follows the code: 36px buttons, the Thai font, the info and shadow rules, the 2B and 2D parts (2D-5 task 30, DC-3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

## Controller: verify and dev-app check (Task 31)

### Task 31: Verify, production build and dev-app check (controller runs this task, not an implementer)

**Files:**
- Create then delete: your own launch configuration (temporary; never committed; leave any other session's `.claude/` content alone).
- Evidence: `.superpowers/sdd/screenshots/ui-phase2d-plan5/after/` and `.superpowers/sdd/ui-phase2d-plan5/task-31-findings.md` (git-ignored).
- Modify: only files needed to fix problems found here. Each fix gets its own small commit with a test where one is possible, through an implementer and the normal review; a fix never adds an `EXEMPT` row or an owner.

**Interfaces:**
- Consumes: Tasks 1–30 committed; the Task 0 baseline, counts, measurements and before images.
- Produces: `task-31-findings.md`, which Task 32 (DC-4) turns into the "Dev-app check" bullets.

- [ ] **Step 1: Full verify.** Run `npm run verify` (lint, tests, build). Record the test count (expected 2187 tests, 2186 pass, 0 fail, 1 skipped after Task 30) and the build page count (60/60 at `388d4d5`; this plan adds no route).
- [ ] **Step 2: Counting evidence after.** Run the Task 0 Step 4 scripts again into `task-31-counts/` and compare: N1 74 in 8 files, N3 24 in 17 files outside the 4 owners, N4 0, N5 0; `unused-message-keys.mjs` → `keys 4062 · unused 0`; `find-unused-messages.mjs` → the 188 runtime-built keys; `api-links.mjs` → only the 10 attachment links without `download`. Run `grep -n 'kind: "phase 3"' tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`: 7 rows, 8 sites, in `c/assets/asset-register-table.tsx`, `c/layout/global-search.tsx` and `src/app/[locale]/(auth)/login/page.tsx` only (R8).
- [ ] **Step 3: Production server.**
  - Add a launch configuration `name: "asset-2d5-start-3101"`, `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "start", "-p", "3101"]`, `port: 3101`, `autoPort: false` (another free port if 3101 is taken; say which).
  - Start it with `preview_start` and log in with the seed admin; do not echo the password.
  - Prefer `waitUntil: "load"` plus a short wait over `networkidle`. Playwright code runs inline (`browser_run_code_unsafe`); a file you must create goes under `.playwright-mcp/` and is deleted right after the run.
- [ ] **Step 4: Write nothing.**
  - Open every dialog, sheet and select to its first screen and close it with ยกเลิก, the X or Esc. Forms are opened, tabbed through and left without saving.
  - Never press: the settings save, the LDAP sync or its preview run, an integration client create, rotate or revoke, a repair save, the scanner's camera start on a device without permission prompts you cannot dismiss, a report export (read the `download` attribute instead of clicking; one header export may be clicked once to check the file downloads, which is a GET), print (use print preview through `emulateMedia({ media: "print" })`).
  - Count POST, PUT, PATCH and DELETE requests while you work. Expected: 0. The findings page's refresh is `router.refresh()` (a GET).
- [ ] **Step 5: Screens.** Take every Task 0 view again under the same name in `after/` and compare with `before/`. Check in Thai at 1440, 768 and 375 (no wrapping, truncation or overlap that was not there before; no horizontal page scroll at 375):
  - **Task 1 (CF-1).** At 375 on `/th/assets/new` and in the register's filter sheet: the circle still looks 24px; `document.elementFromPoint` at 10px left of the circle's left edge and 14px above its top returns the trigger (the `::after` box); at 2px below the circle's bottom returns the select's control, not the trigger; a tap there opens the select. At 1440 only the circle answers (the box is off from `md`); the register table head and the asset page header are unchanged. Record the rectangles before and after.
  - **Task 2 (CF-2).** `/th/audit/rounds` at 375: every next-action foot is whole on at most two lines (`scrollHeight <= clientHeight` of the clamp), its `title` holds the full text, the warning icon sits on the first line; the labels, values and feet of one strip row stay level. `/th/dashboard` at 1440 and 375: one-line feet look as before. A foot longer than two lines (if the data has one) ends in "…".
  - **Task 3 (CF-3).** `/th/dashboard` with "Slow 4G" for one load: the skeleton shows the title, two strips of 4 + 3 cells, three panel frames with a title and a description line, then two panels side by side from `lg`; at 375 one column; no layout jump larger than one strip row when the page arrives.
  - **Tasks 4 and 5 (CF-4, CF-5).** `/th/admin/settings`: the overview reads "3 วัน / 30 วัน", "SLA 2 วัน / …" and the retention days with "วัน"; the LDAP sync badge reads "เปิดใช้งาน (ดูตัวอย่างเท่านั้น)" (or the saved mode's words); the sync mode select lists ดูตัวอย่างเท่านั้น / กดซิงก์เอง / ซิงก์ตามรอบเวลา; the accounting tab lists legacy rules as "<match>: <n> เดือน" if the dev data has one. English pass: "3 days", "Preview", "<n> months". Do not save.
  - **Task 6 (CF-6).** `/th/admin/integrations` with the list loading (throttled): the status reads "กำลังโหลดรายการ" (the accessibility tree); `/en` reads "Loading clients".
  - **Task 7 (CF-7).** `/th/maintenance/new`: type in the asset or reporter option select; the `aria-live` line reads "พบ N รายการ" (and "กำลังโหลด" while it loads); `/en` "N results" / "1 result".
  - **Task 8 (CF-8).** `/th/reports` at 1440 and 375: the two header exports carry `download`, same order, look and permissions; read the `download` attribute (do not click) on `/th/audit/findings`, a round's page (`/th/audit/rounds/<id>`, its three exports), `/th/disposal`, `/th/maintenance` and the register's export menu (`/th/assets` at 1440).
  - **Task 12 (VG-3).** `/th/reports` at 375, a report shown as phone cards: the column labels are 13px on a 20px line, no clipped Thai marks.
  - **Task 13 (FG-1).** `/th/audit/findings` within five minutes of loading, at 1440 and 375: the fresh line is 13px with an outline "รีเฟรชข้อมูล" button (32px from `md`, 44px below); on click the spinner takes the icon's place, the label stays and focus stays on the button; the stale state (after five minutes, or by moving the clock in DevTools) shows the warning `Notice` with the same button at `md`.
  - **Task 15 and Task 20 (FG-3, NG-1).** The asset form's scanner input at 1440 and 375: the camera toggle looks as before (40px from `md`, 44px below, full width below `sm`), starts and stops the camera where the browser allows it; with `prefers-reduced-motion: reduce` emulated, its spinner does not spin. On a phone or an emulated device with a torch (if available): the zoom and torch controls look as before and do not fade while disabled; the lit torch is white on the warning fill.
  - **Task 21 (NG-2).** The bottom bar at 375: the scan button's icon is white on the primary circle, as before.
  - **Task 22 (NG-3).** `/th/login` (not logged in) at 700: the show-password toggle is 44px wide beside the 44px field; at 1440 40px beside the 40px field; it still shows and hides the password and returns focus to the field.
  - **No visible change expected** from Tasks 9–11, 14, 16–19 and 23–27 (keys and guards only): spot-check `/th/audit/rounds/<id>`, `/th/maintenance/<id>` and `/th/disposal` in Thai and English for raw keys.
- [ ] **Step 6: English pass at 1440:** `/en/admin/settings`, `/en/maintenance/new`, `/en/reports`, `/en/audit/findings`, `/en/dashboard`. No raw key, no Thai left on English pages that was English before.
- [ ] **Step 7: Keyboard.** Tab reaches the help trigger and the 2D-4 order is unchanged on `/th/assets/new`; the findings refresh keeps focus while busy; the scanner toggle is reachable and Space/Enter start it; the login toggle keeps its focus ring inside the field.
- [ ] **Step 8: axe.**
  - Inject `node_modules/axe-core/axe.min.js` with `page.addScriptTag({ path })`.
  - Run `axe.run(document.querySelector("main") ?? document.body, { runOnly: ["color-contrast", "label", "aria-valid-attr-value", "aria-required-attr", "button-name", "link-name", "nested-interactive", "target-size", "list", "listitem"] })` at 1440 and 375 on `/th/assets/new`, `/th/assets` (with the filter sheet open at 375, on the sheet), `/th/audit/rounds`, `/th/dashboard`, `/th/admin/settings` (overview and LDAP tab), `/th/admin/integrations`, `/th/maintenance/new`, `/th/reports`, `/th/audit/findings` and `/th/login`.
  - Expected: 0 violations. `target-size` on the help trigger at 375 should now pass (the 44px box); record it either way.
- [ ] **Step 9: Forced colors, reduced motion and zoom.** Forced colors: the help circle's focus ring, the `StatStrip` feet and the warning icon, the busy refresh button and the login toggle stay visible. Reduced motion: no spinner turns on the findings page, the scanner input or the option select. 200% zoom (720×450) on `/th/audit/rounds`, `/th/dashboard` and `/th/admin/settings`: no horizontal scroll, the two-line feet stay inside their cells.
- [ ] **Step 10: NVDA, real devices and paper.** If NVDA or the devices are not available to you, list these for the user and do not mark them done:
  - NVDA: the option select's count reads "พบ N รายการ" on Thai pages; the integration list's loading reads in Thai; a `StatStrip` cell reads its whole foot (the `title` is not read, the clamped text is); the help trigger reads its name.
  - Real phones (iPhone and Android): a tap just above or beside the help circle opens it, a tap on the select under it opens the select; the scanner's zoom and torch on a phone with a torch.
  - Paper: one check-out document and one label sheet (no change expected; R8's paper rows).
- [ ] **Step 11: Findings report.** Write `.superpowers/sdd/ui-phase2d-plan5/task-31-findings.md` with these parts:
  - **Fixes made:** commit and one line each, or "none".
  - **Checked and passed:** what, where, at which widths, with results; the counts of Step 2; the rectangles and measurements of Task 0 Step 6 before and after.
  - **Found but not caused by plan 2D-5.**
  - **Accepted mixes:** the `permanent` rows of R8 that show on screen (the camera controls, the bell's count dot, the attachment preview stage), and any new ones.
  - **Still needs a person:** the Step 10 list.
- [ ] **Step 12: Clean up.** Stop your server, remove your launch configuration and every helper you put under the repo. `git status --short` shows only the untracked folders and files of the Global Constraints.

---

## Area DC, last task: the handoff and the changelog (Task 32)

Task 32 runs after Task 31 (it reads the findings) and before Task 33 (which inserts the verify bullets above the ones it writes).

### Task 32 (DC-4): This plan's handoff section and changelog entry (`DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`)

Spec §6 ("ทุก plan: DH ส่วนของ plan · `docs/99_CHANGELOG.md`"; "เลขบรรทัดหรือจำนวนที่ล้าสมัยใน DH ที่ 2D อ้างถึง (เช่น `ActionButton` "9/7/3" → 1)") and §8 ruling 2. The record of plan 2D-5: the handoff section before `## Open Go-Live Decisions` (H3) and the Thai changelog entry first under the newest date (C1), in the shape of the 2D-4 ones; the handoff's header date (H1); the one stale count the spec names (H2: the 2C plan 5 section, written after 2B-5 had left one `ActionButton` call site). The dated sections of 2A to 2D-4 keep their wording (DC-R1); H3's Docs bullet says once that their "until 2D" lines are closed. The controller adds the verify bullets afterwards (Task 33), directly above "Dev-app check:" and "**ตรวจบนแอป:**".

**Files:**
- Modify: `DEVELOPER_HANDOFF.md` (`i/lf w/crlf`), `docs/99_CHANGELOG.md` (`i/lf w/crlf`)
- Test (append): `tests/phase2d-docs.test.ts` (LF)
- Read: `.superpowers/sdd/ui-phase2d-plan5/task-31-findings.md` (Task 31, git-ignored), the three guard files (for `<P3>`), the user's answers to this plan's open issues. If the findings file is missing, stop and report before editing anything: never write the dev-app check text without it.

**Interfaces:** produces `## UI Round 4 Phase 2D Plan 5 Guard Lock and Final Docs (<today>)` with a `- Dev-app check:` bullet, and `### ล็อก guard และเอกสารรอบสุดท้าย (UI รอบ 4 เฟส 2D plan 5)` with a `- **ตรวจบนแอป:**` bullet; the controller's last task inserts the verify bullet directly above each.

**Changes at `388d4d5`:**

| Id | Line | What changes | Rule |
|---|---|---|---|
| H1 | `DEVELOPER_HANDOFF.md:3` | the header date | — |
| H2 | `DEVELOPER_HANDOFF.md:887` | the 2C plan 5 section's `ActionButton` count: 3 → the one site left by then, which plan 2D-1 later moved onto `Button` | spec §8 ruling 2 |
| H3 | `DEVELOPER_HANDOFF.md:1020` | the 2D-5 section, before `## Open Go-Live Decisions` | spec §6 |
| C1 | `docs/99_CHANGELOG.md:9` | the 2D-5 entry, above the 2D-4 entry under `## 2026-10-17` (C1b instead when `<today>` is another date) | spec §6, `docs/19_THAI_GLOSSARY.md` |

**(H1)** :3, the header date. Replace:

```
> Last updated: 2026-10-07
```

with

```
> Last updated: <today>
```

**(H2)** :887, 2C plan 5 section: "the last 3 ActionButton call sites" was 1 by then (spec 2D §8 ruling 2; the 2B-5 section :827 names the one site). That site is gone at `388d4d5`: plan 2D-1 (commit `a07d1208`, task 2a) moved the error page's retry onto `Button` and deleted `ActionButton` (`error.tsx:30` is now `<Button onClick={unstable_retry}>`; `git grep -n "ActionButton\b" -- src` finds nothing), so the new text says so and names no line. Replace:

```
the keys K13 left unread, the last 3 `ActionButton` call sites) is unchanged.
```

with

```
the keys K13 left unread) is unchanged; of its 3 `ActionButton` call sites one was left by then, the retry button of `src/app/[locale]/(dashboard)/error.tsx` (plan 2B-5 moved the other two; plan 2D-1 moved the last onto `Button` and deleted `ActionButton`; spec 2D §8 ruling 2).
```

**(H3)** :1020, the plan's own section, before Open Go-Live Decisions. Replace:

```
## Open Go-Live Decisions
```

with

```
## UI Round 4 Phase 2D Plan 5 Guard Lock and Final Docs (<today>)

- Branch `feat/ui-phase2d-plan5` in the main checkout (from `master` `388d4d5`: phase 1, 2A, 2B plans 1–5, 2C plans 1–5, 2D plans 1–4, the Thai font fix and the audit mobile fix merged, not deployed). Spec `docs/superpowers/specs/2026-10-15-ui-phase2d-design.md` §3.5 and §5 · plan `docs/superpowers/plans/2026-10-17-ui-phase2d-plan5.md` · canonical values in `DESIGN.md`. The last of five 2D plans (D15): phase 2D is done.
- No new workflow, page, schema, migration, dependency, token or API change. Validation is unchanged. Messages (all through `scripts/messages-edit.mjs`): 6 keys added (`systemSettingsPage.overviewDays`, `depreciationLegacyRuleMonths`, `ldapSyncModePreview`, `ldapSyncModeManual`, `ldapSyncModeScheduled` and `common.searchSelectResultCount`), the Thai texts of `integrationApiPage.loading` and `.loadFailed` changed, and 81 keys no code read deleted (4 settings labels, `auditFinding.freshnessRefreshing` and 76 more): 4137 → 4062 keys. Behaviour: the asset state help opens from a 44px target on phones; every export link downloads the file (`download`); the findings page's fresh-data refresh keeps its label and focus while busy; the scanner input's zoom and torch no longer fade while disabled, and its start and torch spinners stop under reduced motion; the login show-password toggle is 44px wide up to 767px. Nothing else a person does changes.
- **One exempt format (spec 2D §5.1, D1, D13):** `tests/helpers/guard-exempt.ts` (`ExemptKind`, `ExemptEntry`, `ExemptList`, `exemptProblems`, `phase3Rows`) is the one check the three guard files share. Every budget is `{}`: a rule allows only its `OWNERS` (the shared parts that must write the pattern, spec §5.2) and its `EXEMPT` rows, each with the exact count, `kind` `permanent` or `phase 3`, `why` and `ruling`. A count above or below its row fails, and so do an empty reason, a bad kind and an owner inside the list. The lists of moved files (`MIGRATED_FILES`, `BATCH_FILES`, `MIGRATED_LIST_FILES`, `KEEP`, `MIGRATED_FILTER_FILES`) and the local `assertWithinBudget` copies are gone; `TABLE_HEADER_FILLS` keeps its name (the 2B scripts read it).
- **The three guard files:** VFG (Tasks 11, 12): R1, R7 (`TABLE_HEADER_FILLS`, `{}`), R2, R3 and the mockup sizes as exact lists, the scrim check and the `leading-4` check over all of `src` (Task 12 moved the report phone cards' column label to `text-meta`; `Kbd` is its row), and a phase 3 test. FMG (Tasks 13–16) over all of `src` (M18): 9 rules with an `EXEMPT` list (20 rows, 27 sites), `OWNERS` in 4 rules, a meta-test that checks the `EXEMPT` format and that every list and owner names a real file, GF5 still a floor, now with `c/ui/scanner-text-input.tsx` and a row for every file with a constraint, GB3 one rule over every busy button (Task 13 moved the findings page's `DataFreshnessBanner` refresh onto a busy `Button` that keeps its label; `BUSY_LABEL_SWAPS` went), GB2 over every spinner (Task 15: the scanner input's start and torch spinners stop under reduced motion; `tests/spinner-motion-ui.test.ts` went), and `MIGRATED_FILES`, `BATCH_FILES`, `NEW_2C_FILES`, `PENDING_FOOTER_PARTS` and its local `assertWithinBudget` deleted. LFG (Task 17): 19 rules over all of `src`, `src/lib` and the API included, with `OWNERS` on 9 rules and 32 `EXEMPT` rows (67 sites, 57 of them LV2's typed `"-"`, all `permanent` under 2B R-n); `BUDGETS`, `KEEP`, `MIGRATED_LIST_FILES`, L9 and L10 deleted; a literal `aria-current="page"` now counts. `tests/list-filters-ui.test.ts` (Task 18) reads every form and every `FilterFormActions` in `src` (M19, I34); `MIGRATED_FILTER_FILES` deleted. `budgetOverruns` left `tests/helpers/source-files.ts` (Task 19).
- **Five new guards (D14, spec §5.4):** raw colors outside the tokens (what keeps its own, such as the print paper and the camera imagery, is `EXEMPT`), `border-dashed` only in the shared parts, raw `<button>` outside `OWNERS`, no `disabled:opacity-*`, no button or button-like link height at `sm:`. All five live in VFG (Tasks 23–27, N1–N5), each after the commits that moved its sites: the scanner input's camera toggle is a `Button`, its zoom and torch lost `disabled:opacity-60` and the lit torch takes `text-warning-foreground` (Task 20); the bottom bar's scan button takes `text-primary-foreground` (Task 21); the login show-password toggle changes size at `md` (Task 22); the findings banner's raw refresh button went in Task 13. N1 keeps 8 `permanent` rows (74 sites: the A4 document, the label sheet, the signature canvas, the camera controls and scan frames, the attachment preview stage and the bell's count dot); N2 has the owners `FileDropzone` and `SignaturePad`; N3 4 owners and 17 rows (24 sites, the topbar search clear `phase 3`); N4 and N5 allow none.
- **Phase 3 (D2):** the `phase 3` rows are the register's bulk selection bar (`c/assets/asset-register-table.tsx`), the login page frame and the topbar search (`c/layout/global-search.tsx`): <P3> sites in <P3F> files, listed by the phase 3 tests of the guard files.
- **Carried fixes:** the asset state help trigger (`c/assets/asset-state-help-popover.tsx`) keeps its 24px look with a 44px hit area on phones; a `StatStrip` foot wraps to two lines before its ellipsis (`c/ui/stat-strip.tsx`; the 2D-4 dev-app check found the audit rounds list's foot cut at 375). The dashboard skeleton has the page's shape (Task 3, DH 2D-2 R14); the settings page passes no label its form never reads (Task 4) and its screens name the LDAP sync modes, the day counts and the legacy rule months in words (Task 5); the integration client list announces its loading in Thai (Task 6); the maintenance option select announces loading and its result count in the page's language (Task 7, plan 2D-4 open issue 10 c); every export link is `<a download>`: the reports header, the findings, a round's results and variance, disposal, repairs and the register's export menu (Task 8; the last five by the user's answer to open issue CF-c); 76 message keys no code read are deleted (Task 9); the report phone cards' column labels are 13px `text-meta` without `leading-4` (Task 12).
- **Docs:** `DESIGN.md` (the overview up to phase 2D; the guards as `EXEMPT` and `OWNERS` lists; hand-written buttons, raw colors, dashed borders, `disabled:opacity-*` and heights at `sm:`; the `StatStrip` foot; the help trigger; codes in translated sentences wait for phase 3), `docs/14_UI_UX_DESIGN_SYSTEM.md` (the guard paragraph, the Button and `StatStrip` rows, the phase 2D registry row) and `.impeccable/design.json` (36px buttons and dialog controls, the Noto Sans Thai Looped stack, the info-teal note, the shadow guard, the 2B and 2D parts, the `StatStrip` foot); `tests/phase2d-docs.test.ts` keeps "until 2D" and "2D moves" out of the three. The "until 2D" and "wait for 2D-5" lines of the dated sections above are history: this section closes them (what plan 2D-5 took is listed above, the rest under Not taken and Handed on). The 2C plan 5 section's `ActionButton` count is corrected (spec 2D §8 ruling 2).
- **Tests:** new files `tests/phase2d-final-ui.test.ts` (9), `tests/guard-exempt.test.ts` (6), `tests/guard-lock-sweep-ui.test.ts` (3) and `tests/phase2d-docs.test.ts` (4); `tests/spinner-motion-ui.test.ts` (1) deleted; VFG 25 → 31 tests (its phase 3 test and N1–N5), FMG 23 → 24, LFG 23 → 22; one test each added to `tests/feedback-states-ui.test.ts` and `tests/dead-code-cleanup.test.ts`; pins edited with their file in 8 test files; 2159 → <N> tests.
- **Rulings of this plan:** R1 (the earlier rulings), R2 (the carried fixes, CF-R1–CF-R9), R3 (the shared check and VFG, VG-R1–VG-R8), R4 (FMG, FG-R1–FG-R11), R5 (LFG and the list filters, R-LG1–R-LG10), R6 (the new guards, NG-R1–NG-R8), R7 (the docs, DC-R1–DC-R8), R8 (every `EXEMPT` row and the phase 3 total), R9 (assembly).
- **Not taken:** codes inside translated sentences (phase 3, the user, 2026-10-16). The attachment download links without `download` (CF-R8); `leading-tight` / `leading-none` and the report card's `leading-5` value line (VG-a); a fourth phase 3 test that parses the guard files (VG-b); the typed `"-"` that `src/lib` presenters return and LV2's `return "-"` form (LG-a, LG-d); the unread `freshTitle` label (FG-d); a GB3 that also reads `disabled` labels (FG-R3); the alternatives of open issues NG-a to NG-c.
- **Handed on:** phase 3: the `phase 3` rows above (the register's bulk bar with QR label printing, the login page frame, the topbar search), the codes inside translated sentences and the `ActionBar` ⋯ layout. Later: presenters that return `null` for the screens' `Nil` instead of a typed `"-"` (LG-a, LG-d; a logic change); the namespace-aware unused-key search as a repo script (CF-d); the V track removes the three `STAR_ONLY` entries (FG-R7); Dark Mode keeps the paper and camera rows of N1 in their own colors (wiki 27).
- Dev-app check: <from task-findings>
- Before/after screenshots: `.superpowers/sdd/screenshots/ui-phase2d-plan5/before/` and `after/` (git-ignored, on the development machine only).
- Still open, for a person before the one deploy after 2D and V: <from task-findings>, together with the open checks of the sections above.
- Next: merge this branch; then Dark Mode (its spec first), the V track (errors under fields, I31), the E2E suite and the one deploy (wiki 27).

## Open Go-Live Decisions
```

**(C1)** :9, the plan's entry: first under `## 2026-10-17` when `<today>` is 2026-10-17 (otherwise C1b below). Replace:

```
### ตรวจนับ ตัดจำหน่าย ซ่อมบำรุง และธุรกรรมทรัพย์สิน (UI รอบ 4 เฟส 2D plan 4)
```

with

```
### ล็อก guard และเอกสารรอบสุดท้าย (UI รอบ 4 เฟส 2D plan 5)

Branch `feat/ui-phase2d-plan5` (จาก `master` `388d4d5`) · design `docs/superpowers/specs/2026-10-15-ui-phase2d-design.md` ข้อ 3.5 และข้อ 5 · plan `docs/superpowers/plans/2026-10-17-ui-phase2d-plan5.md` · ค่าทั้งหมดอยู่ใน `DESIGN.md` · plan สุดท้ายจาก 5 ของ 2D (2D เสร็จแล้ว)

- **ขอบเขต:** guard 3 ไฟล์ตรวจทั้ง `src` และยอมเฉพาะชิ้นส่วนกลางที่เป็นเจ้าของ (`OWNERS`) กับจุดในรายการยกเว้น (`EXEMPT`) ที่ระบุจำนวน เหตุผล และเลขข้อตัดสิน · guard ใหม่ 5 ตัว · เอกสารออกแบบตรงกับโค้ด · ไม่มีขั้นตอนงานใหม่ ไม่แตะฐานข้อมูล ไม่แก้ API ไม่เพิ่ม token · ข้อความ: เพิ่ม 6 คีย์ (โหมดซิงก์ LDAP 3 แบบ จำนวนวัน จำนวนเดือนของกฎเดิม และจำนวนผลค้นหาของช่องเลือกในงานซ่อมบำรุง) แก้ข้อความกำลังโหลดและข้อความโหลดไม่สำเร็จของรายการ client เป็นภาษาไทย และลบ 81 คีย์ที่ไม่มีโค้ดอ่าน (ผ่าน `scripts/messages-edit.mjs`) · การตรวจกรอกไม่เปลี่ยน
- **guard:** ทุกกฎใช้ตัวตรวจกลาง `tests/helpers/guard-exempt.ts`: ไฟล์นอกรายการต้องนับได้ 0 และไฟล์ในรายการต้องนับได้เท่ากับตัวเลขพอดี (น้อยกว่าก็ไม่ผ่าน เพื่อให้ลดหรือลบแถว) · ทุกจุดที่คงไว้มีเหตุผล เลขข้อตัดสิน และประเภท `permanent` หรือ `phase 3` · ลบรายชื่อไฟล์ที่ย้ายแล้ว (`MIGRATED_FILES`, `BATCH_FILES`, `MIGRATED_LIST_FILES`, `KEEP`, `MIGRATED_FILTER_FILES`) · ปุ่มรีเฟรชข้อมูลบนหน้ารายการไม่ตรงเป็น `Button` ที่แสดงสถานะกำลังทำงานโดยไม่เปลี่ยนชื่อปุ่ม · ไอคอนหมุนของปุ่มเปิดกล้องและไฟฉายในช่องสแกนหยุดเมื่อผู้ใช้ลดการเคลื่อนไหว · ชื่อคอลัมน์ในการ์ดรายงานบนมือถือเป็นตัวอักษร 13px ไม่ใช้ `leading-4` · ก่อนเพิ่ม guard ใหม่: ปุ่มเปิดกล้องในช่องสแกนเป็น `Button` ปุ่มซูมและไฟฉายไม่จางเมื่อปิดใช้งาน ไอคอนปุ่มสแกนบนแถบล่างใช้ token และปุ่มแสดงรหัสผ่านบนหน้าเข้าสู่ระบบเปลี่ยนขนาดที่ `md`
- **guard ใหม่:** สีดิบนอก token (จุดที่คงไว้ เช่น หน้าพิมพ์และภาพกล้อง อยู่ในรายการยกเว้น) · เส้นประใช้ได้เฉพาะในชิ้นส่วนกลาง · `<button>` ที่เขียนเองมีได้เฉพาะในชิ้นส่วนกลางหรือจุดในรายการยกเว้น · ห้ามทำปุ่มที่ปิดใช้งานให้จางด้วย `disabled:opacity-*` · ห้ามกำหนดความสูงของปุ่มหรือลิงก์ทรงปุ่มที่ `sm:`
- **งานเฟส 3:** แถบเลือกหลายรายการของทะเบียนทรัพย์สิน กรอบหน้าเข้าสู่ระบบ และช่องค้นหาบนแถบด้านบน · รวม <P3> จุดใน <P3F> ไฟล์ (test ของ guard แต่ละไฟล์นับให้)
- **แก้ที่ค้างมา:** ปุ่มคำอธิบายสถานะและสภาพทรัพย์สิน (วงกลม 24px) กดได้ 44px บนมือถือ · บรรทัดท้ายช่องของแถบตัวเลขยาวได้ 2 บรรทัดก่อนตัดด้วย "…" (เดิมบรรทัดเดียว ตัดบนหน้ารายการรอบตรวจนับที่จอ 375) · โครงหน้าระหว่างโหลดของแดชบอร์ดตรงกับหน้าจริง · หน้าตั้งค่าระบบเลิกส่งชื่อ 4 ตัวที่ฟอร์มไม่ได้ใช้ และแสดงโหมดซิงก์ LDAP จำนวนวัน และจำนวนเดือนเป็นคำไทย · โปรแกรมอ่านจอได้ยินข้อความกำลังโหลดของรายการ client และจำนวนผลค้นหาของช่องเลือกในงานซ่อมบำรุงเป็นภาษาไทย · ลิงก์ส่งออกไฟล์ทุกจุดดาวน์โหลดไฟล์ (`download`): หัวหน้ารายงาน รายการไม่ตรง ผลและรายการไม่ตรงของรอบตรวจนับ ตัดจำหน่าย ซ่อมบำรุง และเมนูส่งออกของทะเบียนทรัพย์สิน · ลบคีย์ข้อความที่ไม่มีโค้ดอ่าน 76 คีย์
- **เอกสาร:** `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md` และ `.impeccable/design.json` ตรงกับโค้ด (ปุ่ม 36px ฟอนต์ไทย Noto Sans Thai Looped รายการยกเว้นของ guard และแถวของ 2D ในตารางเอกสารออกแบบ) · ไม่เหลือข้อความ "until 2D" หรือ "2D moves" (test ตรวจ)
- **test:** ไฟล์ใหม่ `tests/phase2d-final-ui.test.ts` (9), `tests/guard-exempt.test.ts` (6), `tests/guard-lock-sweep-ui.test.ts` (3), `tests/phase2d-docs.test.ts` (4) · ลบ `tests/spinner-motion-ui.test.ts` (1) · test 2159 → <N>
- **deploy:** ไม่ deploy · deploy ครั้งเดียวหลัง 2D, Dark Mode, งาน V และชุด E2E
- **ตรวจบนแอป:** <จาก task-findings>
- ภาพก่อน/หลัง: `.superpowers/sdd/screenshots/ui-phase2d-plan5/before/` และ `after/` (git ignore อยู่บนเครื่องพัฒนา)
- ต่อไป: merge แล้วเริ่ม Dark Mode (เขียน spec ก่อน)

### ตรวจนับ ตัดจำหน่าย ซ่อมบำรุง และธุรกรรมทรัพย์สิน (UI รอบ 4 เฟส 2D plan 4)
```

**(C1b, only if `<today>` is not 2026-10-17, instead of C1)** Replace the line (the only one):

```
## 2026-10-17
```

with

```
## <today>

### ล็อก guard และเอกสารรอบสุดท้าย (UI รอบ 4 เฟส 2D plan 5)

Branch `feat/ui-phase2d-plan5` (จาก `master` `388d4d5`) · design `docs/superpowers/specs/2026-10-15-ui-phase2d-design.md` ข้อ 3.5 และข้อ 5 · plan `docs/superpowers/plans/2026-10-17-ui-phase2d-plan5.md` · ค่าทั้งหมดอยู่ใน `DESIGN.md` · plan สุดท้ายจาก 5 ของ 2D (2D เสร็จแล้ว)

- **ขอบเขต:** guard 3 ไฟล์ตรวจทั้ง `src` และยอมเฉพาะชิ้นส่วนกลางที่เป็นเจ้าของ (`OWNERS`) กับจุดในรายการยกเว้น (`EXEMPT`) ที่ระบุจำนวน เหตุผล และเลขข้อตัดสิน · guard ใหม่ 5 ตัว · เอกสารออกแบบตรงกับโค้ด · ไม่มีขั้นตอนงานใหม่ ไม่แตะฐานข้อมูล ไม่แก้ API ไม่เพิ่ม token · ข้อความ: เพิ่ม 6 คีย์ (โหมดซิงก์ LDAP 3 แบบ จำนวนวัน จำนวนเดือนของกฎเดิม และจำนวนผลค้นหาของช่องเลือกในงานซ่อมบำรุง) แก้ข้อความกำลังโหลดและข้อความโหลดไม่สำเร็จของรายการ client เป็นภาษาไทย และลบ 81 คีย์ที่ไม่มีโค้ดอ่าน (ผ่าน `scripts/messages-edit.mjs`) · การตรวจกรอกไม่เปลี่ยน
- **guard:** ทุกกฎใช้ตัวตรวจกลาง `tests/helpers/guard-exempt.ts`: ไฟล์นอกรายการต้องนับได้ 0 และไฟล์ในรายการต้องนับได้เท่ากับตัวเลขพอดี (น้อยกว่าก็ไม่ผ่าน เพื่อให้ลดหรือลบแถว) · ทุกจุดที่คงไว้มีเหตุผล เลขข้อตัดสิน และประเภท `permanent` หรือ `phase 3` · ลบรายชื่อไฟล์ที่ย้ายแล้ว (`MIGRATED_FILES`, `BATCH_FILES`, `MIGRATED_LIST_FILES`, `KEEP`, `MIGRATED_FILTER_FILES`) · ปุ่มรีเฟรชข้อมูลบนหน้ารายการไม่ตรงเป็น `Button` ที่แสดงสถานะกำลังทำงานโดยไม่เปลี่ยนชื่อปุ่ม · ไอคอนหมุนของปุ่มเปิดกล้องและไฟฉายในช่องสแกนหยุดเมื่อผู้ใช้ลดการเคลื่อนไหว · ชื่อคอลัมน์ในการ์ดรายงานบนมือถือเป็นตัวอักษร 13px ไม่ใช้ `leading-4` · ก่อนเพิ่ม guard ใหม่: ปุ่มเปิดกล้องในช่องสแกนเป็น `Button` ปุ่มซูมและไฟฉายไม่จางเมื่อปิดใช้งาน ไอคอนปุ่มสแกนบนแถบล่างใช้ token และปุ่มแสดงรหัสผ่านบนหน้าเข้าสู่ระบบเปลี่ยนขนาดที่ `md`
- **guard ใหม่:** สีดิบนอก token (จุดที่คงไว้ เช่น หน้าพิมพ์และภาพกล้อง อยู่ในรายการยกเว้น) · เส้นประใช้ได้เฉพาะในชิ้นส่วนกลาง · `<button>` ที่เขียนเองมีได้เฉพาะในชิ้นส่วนกลางหรือจุดในรายการยกเว้น · ห้ามทำปุ่มที่ปิดใช้งานให้จางด้วย `disabled:opacity-*` · ห้ามกำหนดความสูงของปุ่มหรือลิงก์ทรงปุ่มที่ `sm:`
- **งานเฟส 3:** แถบเลือกหลายรายการของทะเบียนทรัพย์สิน กรอบหน้าเข้าสู่ระบบ และช่องค้นหาบนแถบด้านบน · รวม <P3> จุดใน <P3F> ไฟล์ (test ของ guard แต่ละไฟล์นับให้)
- **แก้ที่ค้างมา:** ปุ่มคำอธิบายสถานะและสภาพทรัพย์สิน (วงกลม 24px) กดได้ 44px บนมือถือ · บรรทัดท้ายช่องของแถบตัวเลขยาวได้ 2 บรรทัดก่อนตัดด้วย "…" (เดิมบรรทัดเดียว ตัดบนหน้ารายการรอบตรวจนับที่จอ 375) · โครงหน้าระหว่างโหลดของแดชบอร์ดตรงกับหน้าจริง · หน้าตั้งค่าระบบเลิกส่งชื่อ 4 ตัวที่ฟอร์มไม่ได้ใช้ และแสดงโหมดซิงก์ LDAP จำนวนวัน และจำนวนเดือนเป็นคำไทย · โปรแกรมอ่านจอได้ยินข้อความกำลังโหลดของรายการ client และจำนวนผลค้นหาของช่องเลือกในงานซ่อมบำรุงเป็นภาษาไทย · ลิงก์ส่งออกไฟล์ทุกจุดดาวน์โหลดไฟล์ (`download`): หัวหน้ารายงาน รายการไม่ตรง ผลและรายการไม่ตรงของรอบตรวจนับ ตัดจำหน่าย ซ่อมบำรุง และเมนูส่งออกของทะเบียนทรัพย์สิน · ลบคีย์ข้อความที่ไม่มีโค้ดอ่าน 76 คีย์
- **เอกสาร:** `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md` และ `.impeccable/design.json` ตรงกับโค้ด (ปุ่ม 36px ฟอนต์ไทย Noto Sans Thai Looped รายการยกเว้นของ guard และแถวของ 2D ในตารางเอกสารออกแบบ) · ไม่เหลือข้อความ "until 2D" หรือ "2D moves" (test ตรวจ)
- **test:** ไฟล์ใหม่ `tests/phase2d-final-ui.test.ts` (9), `tests/guard-exempt.test.ts` (6), `tests/guard-lock-sweep-ui.test.ts` (3), `tests/phase2d-docs.test.ts` (4) · ลบ `tests/spinner-motion-ui.test.ts` (1) · test 2159 → <N>
- **deploy:** ไม่ deploy · deploy ครั้งเดียวหลัง 2D, Dark Mode, งาน V และชุด E2E
- **ตรวจบนแอป:** <จาก task-findings>
- ภาพก่อน/หลัง: `.superpowers/sdd/screenshots/ui-phase2d-plan5/before/` และ `after/` (git ignore อยู่บนเครื่องพัฒนา)
- ต่อไป: merge แล้วเริ่ม Dark Mode (เขียน spec ก่อน)

---

## 2026-10-17
```

- [ ] **Step 1: The failing test.** Append to `tests/phase2d-docs.test.ts`:

```ts

test("the handoff and the changelog record plan 2D-5 in place, with every marker filled (plan 2D-5)", () => {
  const handoff = read("DEVELOPER_HANDOFF.md")
  const section = handoff.indexOf("\n## UI Round 4 Phase 2D Plan 5 Guard Lock and Final Docs (")
  assert.ok(section > handoff.indexOf("\n## UI Round 4 Phase 2D Plan 4 "), "the plan 2D-5 section follows the 2D-4 one")
  assert.ok(section < handoff.indexOf("\n## Open Go-Live Decisions"), "and comes before Open Go-Live Decisions")
  assert.doesNotMatch(handoff, /the last 3 `ActionButton` call sites\) is unchanged/, "spec 2D §8 ruling 2: one call site was left after plan 2B-5")
  assert.doesNotMatch(handoff, /^> Last updated: 2026-10-07$/m, "the header date follows the newest section")
  const changelog = read("docs/99_CHANGELOG.md")
  const newest = changelog.indexOf("\n## ")
  const entry = changelog.indexOf("\n### ล็อก guard และเอกสารรอบสุดท้าย (UI รอบ 4 เฟส 2D plan 5)")
  assert.ok(newest !== -1 && entry !== -1, "the newest date and the plan 2D-5 entry")
  assert.equal(changelog.indexOf("\n### ", newest), entry, "the entry is the first one under the newest date")
  assert.ok(entry < changelog.indexOf("\n### ตรวจนับ ตัดจำหน่าย ซ่อมบำรุง และธุรกรรมทรัพย์สิน (UI รอบ 4 เฟส 2D plan 4)"), "above the 2D-4 entry")
  // Every marker of the DC-4 template is filled; a failure lists the path and the markers left.
  const markers = /<today>|<N>|<P3F?>|<from (?:task-findings|plan)\b[^>]*>|<จาก task-findings>/g
  for (const [path, text] of [["DEVELOPER_HANDOFF.md", handoff], ["docs/99_CHANGELOG.md", changelog]]) {
    assert.deepEqual([path, text.match(markers) ?? []], [path, []])
  }
})
```

  No existing assertion changes. `tests/audit-round-cancellation.test.ts` reads both files for the round cancellation words; the new text removes none.
- [ ] **Step 2: Watch it fail.** `node --test tests/phase2d-docs.test.ts`. Expected to fail: "the handoff and the changelog record plan 2D-5 in place, with every marker filled (plan 2D-5)" ("the plan 2D-5 section follows the 2D-4 one"). The other three pass.
- [ ] **Step 3: Implement.**
  - H1, H2, H3 in `DEVELOPER_HANDOFF.md`; then C1 in `docs/99_CHANGELOG.md` if `<today>` is 2026-10-17 (the newest date at `388d4d5`), otherwise C1b (one of the two, never both).
  - If `.superpowers/sdd/ui-phase2d-plan5/task-31-findings.md` does not exist, stop and report (Task 31 has not run or wrote no findings); never invent the `<from task-findings>` or `<จาก task-findings>` text. (The dry run had no Task 31 and wrote placeholder text there; the marker test passes either way, so the test does not catch this.)
  - If a `<from plan: …>` marker is still in the text, stop and report: the controller fills those when it joins the plan.
  - Fill the markers: `<today>` (`YYYY-MM-DD`); `<N>` (the test count after this commit: Task 31's verify count + 1 for this task's own test, 2188 in the dry run; the same number Task 33's verify bullets record, so the Tests bullet agrees with its own `tests/phase2d-docs.test.ts (4)`); `<P3>` and `<P3F>` from `grep -n 'kind: "phase 3"' tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`: `<P3>` is the sum of the `count:` values of the printed rows and `<P3F>` the number of different files among them, and each must equal what the guard files' phase 3 tests pin (if they disagree, stop and report); `<from task-findings>` and `<จาก task-findings>` from the findings file: what was checked and where, at which widths, fixes or "none", accepted mixes, issues not caused by this plan, and what still needs a person (nested bullets when "Still open" has more than two items, as the 2D-3 section does). Write the Thai one in the shape of the 2D-4 entry's "ตรวจบนแอป" bullet, with the glossary words (`docs/19_THAI_GLOSSARY.md`: ตรวจนับ, รายการไม่ตรง, ตัดจำหน่าย, ซ่อมบำรุง, ส่งมอบ, รับคืน, ทะเบียนทรัพย์สิน, ป้าย, ตัวกรอง, ผู้ถือครอง, ที่ตั้ง).
  - Add `- **The user's answers to the open issues (2026-10-17):** the recommendations taken as written (CF-a, CF-d, CF-e, VG-a to VG-c, FG-a to FG-d, LG-a to LG-d, NG-a to NG-c, DC-a to DC-d); `integrationApiPage.loadFailed` reads "โหลดรายการไม่สำเร็จ" (CF-b); every export link got `download` in Task 8 (CF-c).` after the Rulings bullet, as the 2D-4 section does (the texts above already carry CF-b and CF-c).
- [ ] **Step 4: Guard edits:** none.
- [ ] **Step 5: Verify.**
  - `node --test tests/phase2d-docs.test.ts tests/audit-round-cancellation.test.ts` (all pass).
  - The facts H3 and C1 state: `grep -nE "^(export )?(const|function) (assertWithinBudget|MIGRATED_FILES|BATCH_FILES|MIGRATED_LIST_FILES|KEEP|MIGRATED_FILTER_FILES)\b" tests/*.ts tests/helpers/*.ts` → nothing (at `388d4d5` it prints 7 declarations in the four guard files); `grep -rn "disabled:opacity-" src` → nothing. If one is left, stop and report: the One exempt format and Five new guards bullets and C1's guard bullets change.
  - `grep -n "<today>\|<N>\|<P3\|<from \|<จาก " DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md` → nothing.
  - `node <tools>/eol.mjs DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md` → equal numbers for each; `git diff --numstat` → only the two files and `20 0 tests/phase2d-docs.test.ts` (the handoff at least `21 2`, the changelog at least `16 0`: the findings add lines; the dry run, with one-line placeholder findings, gave `21 2`, `16 0`, `20 0` and eol `1055 1055`, `1885 1885`). `git add -N` is not needed here: the test file is tracked since Task 28.
  - `npm test` (+1: 2188 tests, 2187 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`).
- [ ] **Step 6: Commit.** `git add DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md tests/phase2d-docs.test.ts` then `git commit -m "docs(ui): phase 2D plan 5 guard lock in the handoff and the changelog (2D-5 task 32, DC-4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 33: Final verification, wiki and memory (controller runs this task)

**Files:**
- Modify: `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md` (verify numbers)
- Modify (vault `D:\Obsidian\Eltross`): `AssetSystem/ams-status.md`, `AssetSystem/ams-log.md`, `AssetSystem/ams-open-questions.md`
- Modify (auto-memory): `review-2026-10-priorities.md`

- [ ] **Step 1: Verify.**
  - Run `npm run verify` and record the test count (expected 2188 tests, 2187 pass, 0 fail, 1 skipped) and the build page count (60/60).
  - Add `` `npm run verify` ผ่าน (test N · ผ่าน N · ข้าม 1 · build X/X หน้า) `` to the 2D plan 5 changelog entry, directly above its `- **ตรวจบนแอป:**` bullet.
  - Add ``- Verification: `npm run verify` passes (tests N · pass N · skipped 1 · build X/X pages).`` to the handoff section, directly above `- Dev-app check:`.
  - Both files are CRLF: insert with an exact-string edit that writes `\r\n` (a Node script; `sed -i` in Git Bash writes LF).
  - Run `npm test` again (the docs test of Task 32 still passes), then commit both files with `docs(ui): record phase 2D plan 5 verify results` and the Co-Authored-By line.
- [ ] **Step 2: Wiki.** Read `AssetSystem/_schema/ams-wiki-schema.md` first, then edit:
  - `ams-status.md`: 2D plan 5 is built on `feat/ui-phase2d-plan5` with the verify numbers, not merged, not deployed: phase 2D is done once it merges; the next step is Dark Mode (its spec first). Fix any sentence the row now contradicts (the guards "go down" / budgets, "2D-5 lists them", the info teal, the one-line `StatStrip` foot), and the 2A row spec §6 names.
  - `ams-log.md`: an entry at the top of `## <today>`.
  - `ams-open-questions.md`:
    - the plan 2D-5 checks for a person (Task 31 Step 10): one new numbered item (45 at `388d4d5`), also added to the list in item 27;
    - item 27: the order line reads "2D-5 ✓ → Dark Mode → งาน V → E2E → deploy" once Task 31 passed; "ทวนอีกครั้งก่อน deploy" stays (still no migration and no dependency in 2D);
    - close what 2D settles, if Task 31 passed it: item 20 (info teal outside states: no screen file uses the `info` tokens, `DESIGN.md` §2 and `.impeccable/design.json` say so since Tasks 28 and 30), item 25 (its three findings: the signature pad's clear button wrap went with 2C, the topbar search under the bell at 200% with 2D-2 (D18), the dev machine's attachment 500 is not a code issue), item 31 (`next/link` to `/api`: plain `<a href download>` since 2D-1 (M31), the report header since Task 8); item 21 is already closed (2D-3): leave it;
    - new items for what this plan hands on: presenters in `src/lib` that return a typed `"-"` and LV2's `return "-"` form (open issues LG-a, LG-d), and any open issue below the user has not ruled on.
  - Then run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` from `D:\Obsidian\Eltross`, and commit only those three files with an `ingest:` message. Never stage other sessions' changes in the vault.
- [ ] **Step 3: Memory.** Update `review-2026-10-priorities.md`: 2D plan 5 is built on `feat/ui-phase2d-plan5`, not merged, not deployed; after its merge phase 2D is done. Next: the merge choice, then the Dark Mode spec (wiki 27 order: Dark Mode → V → E2E → deploy).
- [ ] **Step 4:** Use superpowers:finishing-a-development-branch. A local merge fast-forwards `master` (`git merge --ff-only feat/ui-phase2d-plan5` from `master`) and runs the tests on the merged result. Push only if the user asks.

---

## The user's answers (2026-10-17)

The draft's open issues went to the user before execution. Answers:
- **The recommendations, as written:** CF-a (the help trigger's box grows 16px up, 4px down), VG-c (`why` in English), NG-a and NG-b (the bell's count dot and the attachment preview stage are N1 `permanent` rows), NG-c (the login toggle N3 `permanent`), DC-a (the old "until 2D" lines stay as history, closed by the 2D-5 section), DC-b (`.impeccable/design.json` names Noto Sans Thai Looped). The items the questions did not name stay as the plan wrote them: CF-d (the unused-key search stays outside the repo), CF-e (the wording of Tasks 5 and 7), VG-b (one phase 3 test per guard file), FG-b to FG-d, LG-a to LG-d (`src/lib` "-" rows `permanent`, LV2 over all of `src`, the login title `phase 3`, typed "-" later), DC-c, DC-d.
- **Messages:** the 6 additions and 81 deletions as listed; `integrationApiPage.loadFailed` becomes "โหลดรายการไม่สำเร็จ" (CF-b, Task 6 Step 3b): 2 th values change.
- **CF-c:** every export link gets `download` in Task 8 (11 links in 6 files; the attachment links stay, CF-R8).
- **Tasks 12 and 15 stay** (VG-a, FG-a).
- Plan size, behaviour changes and the phase 3 total (8 sites in 3 files) as the draft gave them; the export links join the behaviour list (they download, as before, since their routes answer `attachment`).
