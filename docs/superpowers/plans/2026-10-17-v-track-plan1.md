# V Track Plan 1 Implementation Plan: the server, the foundation, and the master-data and admin forms

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the first plan of the V track, "errors under the field" (`docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md`, the user's decisions U1–U9). After it:
- every route's 400 for invalid input names its fields: `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors }`, one camelCase code per dotted key, `_form` for an error without a field; the settings route keys by setting, the asset batch by row; checkout's `HANDOVER_*` and disposal's evidence branches keep their `code` and add `fieldErrors`; supplier is on the shared body; the non-zod field refusals of spec §6.2 and the duplicates that ended in a 500 answer with the same body (409 `DUPLICATE` for duplicates); Integration v1 does not change (spec §6, U3, U9; Tasks 1–10, and Task 29a for the last four duplicates and the employee's user account);
- one shared foundation exists: rule helpers that return codes, 17 `common.validation` messages and one resolver, a focus helper that keeps the field clear of the topbar and the save bar, the `useFieldErrors` / `useValidationMessage` hooks, one announcement per submit, the SearchableSelect error look, `FieldGroup`, and the V guards that hold every form of the scope (spec §7.1–§7.3, §8; Tasks 11–18);
- the 9 master-data forms, the admin user and role forms, the integration client create and edit, the asset state review dialog, the data-quality rules and the report preset name show their errors under the field, never as a validation toast, focus the first wrong field on submit, and show the server's refusals on the same fields (spec §5 #34–#44, #47–#50, #52; G1–G3, G5; Tasks 19–29).

No migration, no database write, no schema change, no new dependency. Messages change only as "Messages" below lists. Not in this plan: the settings form (#45) and the prefix editor (#46), the asset, operation, audit, disposal and maintenance forms (later plans of the track), and DESIGN.md's form-error rule (the track's final plan, spec §9.4).

**Architecture:**
- **Order S, then F, then M** (spec §8 "the server change is reviewed first and lands as the first commits of the round"; spec §9 steps 1–3):
  - S (Tasks 1–10): `src/lib/field-errors.ts`, the shared body, the code map, the key rules, the special routes, supplier on the shared body, the 409 duplicates, the §6.2 field refusals, the catalog key.
  - F (Tasks 11–18): `validation-rules.ts`, `common.validation.*` and `field-error-client.ts`, `field-focus.ts`, `use-field-errors.ts`, `Field`/`FieldError`, SearchableSelect and its two wrappers, `FieldGroup`, `tests/validation-guards.test.ts`.
  - M (Tasks 19–29): the forms, one task per form or small group, each adding its files to `V_FORMS`.
  - S11 (Task 29a, added on the user's answers of 2026-10-17): the four duplicates §6.2 does not name that still ended in a 500, and "Employee already has a user account", under their field. A server task like Tasks 1–10, placed after Task 29 so no task number moves; it touches no form (the forms already hold its keys).
- **One task is one commit**, with its test and every pin or guard edit it causes. The tree is green after every commit.
- **Hard dependencies:** Tasks 2–10 need Task 1; Tasks 4–10 need Task 2's test header (the resolve hook, `load`) and Task 4's `jsonRequest`/`stubDb` from Task 5 on; Task 9 needs Task 8 (it widens Task 8's import line in `employees/[id]` and `locations/[id]`); Task 10 needs Task 6 (both edit the checkout route). Task 11 needs Task 1 (`FieldErrorCode`); Tasks 12–18 need Task 11's test file; Task 14 needs Tasks 12 and 13; Task 17 needs Task 13 (the focus helper reads `data-slot="field-group"`). Every M task needs Tasks 1–18; Task 22 (M4) needs Task 7 (S7); Task 27 (M9) needs Task 17 (F7); each M task needs the one before (they append to `tests/v-track-m.test.ts` and to `V_FORMS`). Task 29a needs Tasks 1–10 (it widens Task 8's import line in the category routes and Task 9's in `admin/roles/[id]`, uses the `FieldRefusalError` import Task 9 gave the user routes, and appends after Task 10's test) and runs after Task 29, before Task 30.
- **Task ids:** every task keeps its area id in its title, its test names and its commit message: "(v-track plan 1 task 22, M4)". The text cross-references by "Task N (id)" or by id.
- **Branch:** `feat/v-track` in the main checkout `D:/Antigravity/asset-system`. No worktree.
- **Tests:** five new LF test files and one helper, one test per commit except Task 18:
  - `tests/v-track-s.test.ts` (Tasks 1–10 and 29a, 11 tests; Task 22 cuts the end of Task 7's test, A-R4);
  - `tests/v-track-f.test.ts` (Tasks 11–17, 7 tests);
  - `tests/validation-guards.test.ts` (Task 18, 6 tests) and `tests/helpers/validation-reader.ts`; every M task adds rows to its `V_FORMS`;
  - `tests/v-track-m.test.ts` (Tasks 19–29, 11 tests);
  - `tests/v-track-docs.test.ts` (Task 31, 1 test; Task 31 also moves one assertion of `tests/dark-mode-docs.test.ts`);
  - existing pins that lock what changes are edited in the same commit (each task's Step 4 lists them); two test files go: `tests/supplier-api-error.test.ts` (Task 7, 4 tests) and `tests/supplier-form-errors.test.ts` (Task 22, 2 tests).
- **Controller tasks:** Task 0 (branch, baseline, counting evidence, before evidence), Task 30 (verify, production build, dev-app check in both themes), Task 32 (verify numbers, wiki, memory, finishing). They are described, not rehearsed. Task 31 (the docs) is an implementer task like Tasks 1–29a; the dry run ran it with placeholder findings.

**Tech Stack:** Next.js 16.4 App Router · React 19 · Tailwind CSS 4 · next-intl 4 (`useTranslations`, `t.has`) · zod 4.4.1 (issue codes in `node_modules/zod/v4/core/errors.d.ts`) · Prisma 7 (`P2002` unique errors; not changed) · `node --test` with Node 24 type stripping (strip-only: no parameter properties, no enums in modules tests import). No new dependency; `react-hook-form` stays unused (spec §3).

**Spec:** `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` (approved by the user, 2026-10-17: "อนุมัติสเปก เริ่มเขียนแผนได้เลย").
- **What this plan covers:** spec §6 (all of it), §7.1–§7.3 and the guards of §8, and the forms of master data and admin (§5 #34–#44, #47–#50, #52). "Spec coverage" near the end maps each section to its task and names what the later plans do.
- **Left to the builder (§10), decided here:** the hook's name and shape (F-R4), the `common.validation` wording (F-R2, open issue 5), how `FieldError` avoids N alerts (F-R6), the SearchableSelect invalid mechanics (F-R7), how the review dialog hands back to its form (M-R9), the per-form focus order (M-R1), the split (areas S, F, M; plan 1 of the track), how the guard detects a validation toast (F-R9).
- **Line numbers** are of `71e5251` unless a step says "when this task runs". They move as earlier tasks edit a file; find every site by its quoted text.
- **Prior art:** `docs/superpowers/plans/2026-10-17-dark-mode.md` (format), `docs/superpowers/plans/2026-10-17-ui-phase2d-plan5.md` (the guard vocabulary: `EXEMPT`, `OWNERS`).

`c/` = `src/components/` · `D/` = `src/app/[locale]/(dashboard)/` · `<temp>` = `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/v-plan` (the controller hands the path to every implementer; change files go here) · `<tools>` = `<temp>/tools` (`eol.mjs`, read-only).

**Dry run (done, 2026-10-17).** Tasks 1–29 and Task 31 ran in this order as one chain from `71e5251`, one commit per task, each step as written, in `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/v-sim` (a clone of the real checkout, `core.autocrlf=true`, whose working-tree line endings match `D:/Antigravity/asset-system` file by file, with its own `node_modules`), branch `v-dry`. Every Step 1 block, pin string, guard row and change file was copied from this text; the source edits followed each Changes table (the area rehearsals' files where they match the table, checked against it, and exact-string edits that keep each line's ending). Every Step 2 failed with the test or error it names, every "after Step 3 and before Step 4" list failed exactly as listed, and every task ended with `npm test` 0 fail and 1 skipped at the count its Step 5 gives (each A-R6 estimate held), `npx tsc --noEmit` clean and `npm run lint` 0 errors and 146 warnings, all under `.agents/`. Every edited file kept its working-tree line endings (`git ls-files --eol` against the real checkout) and every new file is LF.
- **Sim commits** (`v-dry`): 1 `989973bf` · 2 `1c92b336` · 3 `d375302f` · 4 `f37a665a` · 5 `a780e744` · 6 `8245ad9c` · 7 `438a6a75` · 8 `62fbc207` · 9 `4cd45694` · 10 `037de641` · 11 `46e19cd3` · 12 `ad1aa3d2` · 13 `93ad6945` · 14 `a1ff70a2` · 15 `1a7c8d2c` · 16 `be39e547` · 17 `3422a876` · 18 `85050441` · 19 `6dd625c2` · 20 `2656c5dc` · 21 `eb685cae` · 22 `6e1c0f33` · 23 `2712ea38` · 24 `65a1d1af` · 25 `65d0a0c5` · 26 `7dffc590` · 27 `77af15f2` · 28 `929a6d64` · 29 `1cb49f80` · 31 `2b7ad8e1` (placeholder findings, as Dark Mode's dry run did). End state of `v-dry` (without Task 29a): 2255 tests, 2254 pass, 0 fail, 1 skipped; 4090 message keys per locale; `V_FORMS` 15 files; 17 `<form … noValidate>` in `src`.
- **Task 29a (S11), added on the user's answers of 2026-10-17 and rehearsed after the main dry run**, in the same clone: branch `v-dry-29a` from `1cb49f80` (Task 29), Task 29a `5224f0b0`, then Task 31's commit `2b7ad8e1` cherry-picked on top with Task 31's text as amended for Task 29a and the answers, `887147bf`. Step 2 failed as written, no pin failed, every Step 5 number held: after Task 29a 2255 tests, 2254 pass, 0 fail, 1 skipped; after Task 31 2256, 2255 pass, 0 fail, 1 skipped (the four docs test files 17 tests, 0 fail; numstat `21 1`, `14 0`, `1 1`, `32 0` as before); 4092 message keys per locale; `V_FORMS`, the `noValidate` forms and every guard count as above (Task 29a touches no form); `tsc` clean; lint 0 errors, 146 warnings, all under `.agents/`. The clone's working tree was CRLF after `git switch` (`core.autocrlf`), so the files that are LF in the real checkout were set back to LF before the edits (no content change). The sim is left on `v-base`; `v-dry` and `v-dry-29a` are kept.
- **What the dry run corrected in this text:**
  - Line endings: the area clones were CRLF everywhere, the real checkout is not. 28 of the 91 existing files this plan edits are `w/lf` and one is `w/mixed` (Task 29a adds a 92nd, `src/app/api/admin/integration-clients/route.ts`, CRLF); the Global Constraints list them, each task's Files line says which, and the `eol.mjs` lines of Tasks 15 and 16 print the real numbers.
  - Task 7 Step 6: `git add -A <path>` of a path that Step 3's `git rm` already removed fails (`fatal: pathspec 'src/lib/supplier-api-error.ts' did not match any files`, exit 128, nothing staged); Step 6 now adds only the edited paths (the deletions are staged).
  - Task 22 Step 3: `git grep -l "supplier-form-errors"` also prints `tests/v-track-m.test.ts` (Task 22's own `doesNotMatch`).
  - Task 0 Step 4, F's inventory and F-R9: at `71e5251` the guard's reader counts 16 required selects without `error=` in 12 files, because the two wrappers' own `<SearchableSelect required={required}>` count too; Task 16 gives them `error={error}`, so 14 in 10 files from then on, which is what Task 18's `SELECT_STAR_ONLY` locks.
  - Task 30 Step 3: `noValidate` is counted as a `<form>` attribute (a plain line count gives 33: the forms' `validate()` comments name it); the toasts outside a catch go 62 → 61 (only `supplier-form.tsx:133`; the data-quality toast sat in a bare `catch`); the leftover-name grep also prints Task 22's `doesNotMatch` line.
  - Task 31 is written out (it was a placeholder) and was rehearsed on the chain (C1, `<today>` = 2026-10-17); its C1b path (a later `<today>`, with H1) was rehearsed too, on a throwaway worktree of `v-dry`'s Task 31 commit with `2026-10-18`: the four docs test files 17 tests, 0 fail; numstat `22 2` / `18 0`.
  - Task 30 Step 5: each "allowed" refusal was checked against its route at `71e5251` (the check runs before any write), with line numbers; the state review dialog also serves **dismiss**, which writes on a valid reason, and the review page's scan is a writing `POST`: both are now on the "never" list.

- **What the final review changed** (text only; no Step 1 block, pin string, guard row, change file or count moved, so the dry run's numbers stand): the inventory's S3 exemption cites S-R11; F's "How a form task uses F" says it illustrates the calls and that M's forms use a `FIELD_IDS` table without `params`; A-R8 names the state review's resolve (never dismiss), as Task 30 Step 5 does; Review Focus 2 says what Task 1's test covers; Task 30 Steps 6 and 8 follow open issues 6 and 7; "Spec coverage" gained the non-goals, §5's per-form and count rows (the spec's 15 asterisk-only selects are 14 in its own recon list) and §7.3's `SignaturePad`; "Open issues" gained recommendations for every item, item 6 widened to every duplicate a plan-1 form shows, item 7 (Enter saves the preset name), and the list of behaviour changes beyond the spec. Task 31's open-issues bullet and Task 32's wiki step say 1–7 (same line count, so Task 31's numstat holds).

Before assembly each area ran alone:
- **S** (`<temp>/sim-S`, branch `simS`, tag `s-base` = `71e5251`): S1 `a93e991f` · S2 `daa63160` · S3 `da9f5447` · S4 `486169ae` · S5 `1936f1d9` · S6 `b11a17c4` · S7 `e66fd7e7` · S8 `9e06af82` · S9 `718827f4` · S10 `9e444fd0`; every Step 2 failed as written; `npm test` 2227 … 2232 (S7 2229: 4 tests deleted, 1 added), 0 fail, 1 skipped; `tsc` clean; full lint 0 errors, 146 warnings.
- **F** (`<temp>/sim-F`, branch `f-dry`, on one marked stand-in for S, `cf0f2a19`: `FORM_ERROR_KEY` and the FIXED 1 types only): F1 `827e4e19` · F2 `83d13191` · F3 `45f25d04` · F4 `2d0a4f43` · F5 `838d367c` · F6 `0419878f` · F7 `c3667944` · F8 `d8695cd9`; every Step 2 failed as written; `npm test` 2227 … 2233, then 2239 (+6 at F8), 0 fail, 1 skipped; `tsc` clean; lint 0 errors, 146 warnings. The focus helper ran in Chromium on a mock shell (F-R5). The hook did not run inside React (no DOM test library, no dev server in a rehearsal); Task 30 exercises it.
- **M** (`<temp>/sim-M`, branches `m-sim` and `m-replay`, on one marked stand-in for S and F, `2758ccaf`: the rule helpers, the types, a hook with M-R3's contract, twelve stand-in messages and a stand-in guard): M1 … M11 `34adb0ea` … `a2d20529` (`m-replay`, identical to `m-sim`); every Step 2 failed as written and exactly the listed pins failed before their edit; `npm test` 2228 … 2238, 0 fail, 1 skipped; `tsc` clean; lint 0 errors, 146 warnings.
- **Assembly check** (`<temp>/sim-M`, branch `asm-m9`, commit `00c47000`, built by `<tools>/asm-m9.mjs` on `m-replay`): Task 27 (M9) on F7's real `FieldGroup` (A-R3): the M9 test as printed below, the `:244` pin, and 12 related test files, 184 tests, 0 fail; full `npm test` 2238 / 2237 / 0 / 1 (unchanged); `tsc` clean; eslint clean on the four files.
- **What the dry run confirmed:** M on F's real hook, messages and guard (A-R2, A-R5: every M test and pin passed as written on Tasks 1–18); Task 22's supplier hand-off on Task 7's state (A-R4: the module and its test go, Task 7's test ends at its two `existsSync` lines, −1); every count of A-R6.

**Base:** `feat/v-track` at `71e5251` (`master` `9e17cab`, phase 2D and Dark Mode merged and not deployed, plus the spec's commit `71e5251`).

## Global Constraints

- **Git:**
  - Work in the main checkout `D:/Antigravity/asset-system` on branch `feat/v-track`, which holds `71e5251` and this plan's commit (`docs/superpowers/plans/2026-10-17-v-track-plan1.md`).
  - Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase` or `git clean`, never touch `master`, never push. (A `git stash` in a rehearsal rewrote an LF test file as CRLF.)
  - Commit only the files your task names. Use `git add <paths>` (quote paths with brackets or parentheses) and never a bare `git add -A` or `git add .`; `git rm <paths>` stages a deletion; never name a path `git rm` removed in a later `git add` (git stops with "pathspec … did not match any files" and stages nothing).
  - The checkout has untracked folders and files that are not yours: `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/` and `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`; another session may add `.claude/` while its preview server runs. Leave them alone.
  - End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (each Step 6 passes it as a second `-m`).
  - Never create a git worktree whose `node_modules` is a junction to the main checkout's, and never let git remove one.
- **Next.js 16.4** is not the Next.js in your training data. This plan uses no new Next API: route handlers keep answering with `NextResponse.json(body, { status })`. Before you change how a route answers, read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-response.md` (`## json()`) and `03-file-conventions/route.md`, and heed their deprecation notices.
- **Repo facts:** React 19; Tailwind 4; next-intl 4 (`t.has(key)` at `node_modules/use-intl/dist/types/core/createTranslator.d.ts:41`); zod 4.4.1 (an issue carries `code`, `path`, `message` and per code `origin`, `minimum`, `maximum`, `format`, `expected`; `received` only for `NaN` and Invalid Date; no `input` unless `reportInput` is on); Prisma 7 (`P2002` for a unique index); `npm test` runs `node scripts/run-tests.mjs` over `tests/**/*.test.{ts,mjs,js}`; tests import `.ts` with relative imports and read `.tsx` as text; `tsconfig.json` includes `**/*.ts`, so tests are type-checked.
- **Line endings:**
  - `git config core.autocrlf` is `true`. Most existing files this plan edits are CRLF in the working tree (`i/lf w/crlf`), among them `messages/th.json`, `messages/en.json`, the `src/lib` files and most components and tests. These 28 are LF (`i/lf w/lf`): in `src/app/api/`, `assets/route.ts`, `assets/batch/route.ts`, `assets/[id]/status-correction/route.ts`, `assets/import-preview/route.ts`, `assets/import-confirm/route.ts`, `notifications/route.ts`, `purchase-documents/route.ts`, and both `route.ts` and `[id]/route.ts` of `branches`, `categories`, `departments`, `employees`, `locations`, `brands` and `models`; `src/components/ui/field.tsx`, `src/components/ui/field-variants.ts`; `tests/field-primitives.test.ts`, `tests/asset-forms-ui.test.ts`, `tests/master-data-sweep-ui.test.ts`, `tests/admin-sweep-ui.test.ts`, `tests/reports-dashboard-sweep-ui.test.ts`. `src/app/api/disposal-requests/[id]/route.ts` is `w/mixed` (219 of its 238 lines CRLF after Task 6): keep each line's ending. `git ls-files --eol` (next bullet) is the authority; each task's Files line says the same.
  - These are new and LF: `src/lib/field-errors.ts`, `src/lib/field-error-response.ts`, `src/lib/validation-rules.ts`, `src/lib/field-error-client.ts`, `src/lib/field-focus.ts`, `src/components/ui/use-field-errors.ts`, `src/components/ui/field-group.tsx`, `src/lib/category-custom-field-names.ts`, `tests/v-track-s.test.ts`, `tests/v-track-f.test.ts`, `tests/v-track-m.test.ts`, `tests/validation-guards.test.ts`, `tests/helpers/validation-reader.ts`, `tests/v-track-docs.test.ts`.
  - Before you edit a file, run `git ls-files --eol <file>` and keep what it shows. In Git Bash, `grep -c $'\r'` reports 0 even for CRLF files, so do not use it as a check.
  - `git add` of an LF working-tree file prints "LF will be replaced by CRLF the next time Git touches it". That warning is expected and harmless: do not renormalize.
  - Keep the file's line endings: edit with exact-string replacement (the Edit tool keeps them), never a formatter, never `sed -i` (it writes LF in Git Bash), never normalize a file.
  - **Never write a test that asserts working-tree line endings** (a Windows checkout writes CRLF). Tests that read source files strip `\r` (`.replace(/\r\n/g, "\n")`) before multi-line regexes.
  - Check line endings with `node <tools>/eol.mjs <file>…`. A CRLF file prints the same number twice; an LF file prints 0 and then the line count:

```js
// eol.mjs: node <tools>/eol.mjs <file>…   prints "<file> <CRLF count> <LF count>".
import { readFileSync } from "node:fs"
for (const file of process.argv.slice(2)) {
  const source = readFileSync(file, "utf8")
  console.log(file, (source.match(/\r\n/g) ?? []).length, (source.match(/\n/g) ?? []).length)
}
```

- **How to read a task:**
  - **Changes at 71e5251** is a table of the sites: the line, what is there now (quoted as it is, LF shown; a CRLF file has CRLF), what it becomes, and the rule. "Becomes" is exact where a test pins it and an exact description otherwise; every prop and class the row does not name stays. Rows may be applied in any order. It is not a replacement transcript: read the file, make the change, and let the task's tests and guards confirm it.
  - **Step 1 code blocks are exact:** create or append them byte for byte. "Append" adds the block at the end of the file; the first line of a block shown empty is the blank line before it. Blocks with regex backslashes are written with a file tool, never a shell heredoc or `node -e` (both dropped or rewrote backslashes in the rehearsals; one turned `\b` into a backspace byte).
  - **Pin edits and guard edits** are exact old → new strings; each old string occurs once in its file.
  - **A comment a row adds is source the tests read.** It must not contain a string a task's `doesNotMatch` forbids (each task names its own: for example no literal `role="alert"` in `field.tsx`, no `toast` call text in `use-field-errors.ts`, no `@/` in the modules tests import).
  - **Counts.** Each task's `npm test` numbers are the full totals after the task (tests, pass, fail, skipped), as the dry run measured them on the whole chain. A total that differs means stop and report, with the task's own delta (+1 for most tasks). Each `0 <number>` of an LF file is its line count in the dry run; where a step says "its line count", any count is fine as long as the file is LF or keeps its CRLF.
- **Tests:**
  - Run one file with `node --test tests/<file>.test.ts`.
  - Modules that tests import use relative `.ts` imports (no `@/`): `field-errors.ts`, `validation-rules.ts`, `field-error-client.ts`, `field-focus.ts`, `field-variants.ts`. Tests cannot import `.tsx`; they read it as text. A plain import of a type name fails under type stripping: use inline `type` specifiers. A class in such a module declares its fields in the class body (strip-only mode refuses parameter properties, S-R6).
  - Route modules import `next/server` and `@/…`: `tests/v-track-s.test.ts` loads them through the resolve hook of Task 2 (S2), never by a static import.
  - A test file that imports another test file runs that file's tests again: no test imports a test file.
- **Baseline at `71e5251`** (Task 0 checks it again): `npm test` 2226 tests, 2225 pass, 0 fail, 1 skipped; `npx tsc --noEmit` clean; `npm run lint` 0 errors, 146 warnings, all under `.agents/`.
  - **Chain estimates** (A-R6): after Task 10, 2232 tests; after Task 18, 2245; after Task 29, 2254; after Task 29a, 2255; after Task 31, 2256; pass one fewer, 0 fail, 1 skipped.
- **Every task ends with all of these green:** `npm test` with 0 fail and the task's count; `npx tsc --noEmit`; `npm run lint` with 0 errors and no new warning in `src/` or `tests/`. Report any failure by name.
- **Messages:** only through `node scripts/messages-edit.mjs <change file>` (`{"set":{"th":{...},"en":{...}},"delete":[...]}`), with the change files saved in `<temp>`, and only these keys (4067 → 4092 leaf keys per locale, A-R6):
  - Task 3 (S3) adds `apiErrors.recipientRequired`; Task 7 (S7) deletes `apiErrors.invalidSupplierData`; Task 8 (S8) adds `apiErrors.companyCodeExists`, `departmentCodeExists`, `employeeCodeExists`, `locationCodeExists`, `brandNameExists`, `modelNameExists`, `categoryCodeExists`;
  - Task 12 (F2) adds the 17 keys of `common.validation` (F-R2; wording: open issue 5);
  - Task 20 (M2) adds `branch.saveNeedsCompany` and `location.saveNeedsBranch`; Task 22 (M4) deletes `supplier.duplicateCode`, `supplier.invalidEmail`, `supplier.fieldTooLong`;
  - Task 29a (S11) adds `apiErrors.customFieldNameDuplicate` and `apiErrors.integrationClientIdExists`.
  - Words follow `docs/19_THAI_GLOSSARY.md`; `tests/thai-glossary.test.ts`, `tests/messages-parity.test.ts` and `tests/messages-edit.test.ts` stay green. If you think another key is missing, stop and report.
- **The form convention** (FIXED 6, M-R1–M-R5): `<form onSubmit={…} noValidate …>` with `noValidate` directly after `onSubmit`; the HTML constraint attributes stay (`required`, `maxLength`, `minLength`, `pattern`, `type="email"`; FMG `CONSTRAINT_FLOORS`); a module-level `validate()` restates them through the rule helpers; errors go under the field through `Field error=` (a group: one `FieldError` or `FieldGroup error=`); no `toast.error`/`toast.warning` for a validation error (a catch keeps its toast for other failures, spec U2); never `role="alert"` or `aria-live="assertive"` on a field error (F-R6); never `aria-invalid` on a `<button>` (F-R7).
- **Guards:** `tests/form-migration-guards.test.ts` (FMG), `tests/visual-foundation-guards.test.ts` (VFG), `tests/list-frame-guards.test.ts` (LFG), `tests/ui-overlay-guards.test.ts`, and from Task 18 `tests/validation-guards.test.ts` (V1–V5).
  - A commit that changes what a guard or pin counts edits it in the same commit.
  - The only guard rows this plan adds are the `V_FORMS` rows of the M tasks (A-R5) and Task 3's `nonErrorMessageFiles` (S-R11, each with its reason). No task adds an `EXEMPT` row, an owner, a `V_SCOPE`, `NOT_IN_SCOPE` or `SELECT_STAR_ONLY` row, or a `CONSTRAINT_FLOORS` change. Never add a row to make a test pass. If a change would make a guard fail and the task does not list that edit, stop and report.
- **The server:** no migration, no database write, no schema change, no new dependency. No server rule is added (spec §6.3): every refusal of Tasks 6–10 existed, only its body gains `fieldErrors`; status codes stay, except that a duplicate that ended in a 500 answers 409 (Tasks 8 and 29a; the database's own unique index refused each of them before). Task 29a's inactive branch code answers Task 9's 400, as an active branch's code does. Integration v1 (`src/app/api/integrations/v1/**`, `integrationErrorResponse` in `src/lib/integration-auth.ts`) does not change; Task 2's test pins it.
- **Off limits:**
  - Never open, read or print `.env` or `.env.prod-admin`.
  - Implementers do not run `npm ci`, `npm install`, `npm run build`, the dev server, or anything against a database. The controller runs the app in Tasks 0 and 30, and writes nothing to the database there.
  - Do not run skill helper scripts; they make network calls. The scripts in `<tools>` are read-only and run with the repo root as the working directory.
  - Keep helper scripts and change files in `<temp>`, outside the repo.
  - In Git Bash, MSYS rewrites a command-line argument that looks like a path (one that starts with `//` or `/`, or holds `=/`) and turns its backslashes into slashes: set `MSYS_NO_PATHCONV=1` for such a call (in the dry run a pin's old string `=/<Field label=\{t\(…` passed to a replace script came out as `C:/Program Files/Git/<Field label=/{t/(…` and matched nothing). The Edit tool does not have this problem.
- **Deploy:** none. One deploy after Dark Mode, the whole V track and the E2E suite (wiki item 27).
- **Executors** are Opus-medium subagents that see only their task brief and these Global Constraints; the controller reviews every task before the next starts.

### The shared contract (FIXED INTERFACES, verbatim)

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

## Rulings of this plan

- **R1, the earlier rulings apply**, above all those the tasks quote: spec 2C K4, K5 a, K6 a and §8.5 (`validationFailedBody`, `apiErrors.validationFailed`), plan 2D-5's guard vocabulary, and Dark Mode's two-theme rule (every new style uses tokens; the error look and the teal focus work in both themes). Each area adds its own below under the ids its tasks quote (`S-R1`, `F-R1`, `M-R1` …); R5 records the assembly decisions (`A-R1` …).

- **R2, the server (area S, Tasks 1–10 and 29a):**

  - **S-R1, one module for field errors, reachable from tests and client code.** `src/lib/field-errors.ts` (LF) imports only `./api-error-catalog.ts` (relative, with the extension; the catalog imports nothing), so it has no `@/` import and no zod run-time import, as FIXED INTERFACE 1 requires. Client components already import modules with relative `.ts` imports (e.g. `src/lib/maintenance-options.ts`). The interface's `IssueLike` gains one optional member, `received?: unknown`: zod 4 sets it only for `NaN` and `Invalid Date`, and it is the only way to tell a bad number from a missing one (zod issues carry no `input` unless `reportInput` is on).
  - **S-R2, the code map.** A message the api-error catalog knows wins over the issue code, for any issue (custom issues, and custom messages on built-in checks: `z.enum(…, { error: "HANDOVER_MODE_REQUIRED" })` → `handoverModeRequired`, `.min(2, "Batch create requires at least 2 rows")` → `batchCreateMinRows`). Otherwise:

    | zod 4 issue | code |
    |---|---|
    | `invalid_type`, `expected: "date"` (also `""` coerced to Invalid Date) | `invalidDate` |
    | `invalid_type`, `expected: "number"` with `received` set (`NaN`) | `invalidNumber` |
    | any other `invalid_type` (a missing key, `expected: "nonoptional"`) | `required` |
    | `too_small`, `origin: "string"`, `minimum` ≤ 1 | `required` |
    | `too_small`, `origin: "string"`, `minimum` > 1 | `tooShort` |
    | `too_small`, `origin: "array"` or `"set"` | `required` |
    | `too_small` of any other origin (number, date, bigint) | `outOfRange` |
    | `too_big`, `origin: "string"` | `tooLong` |
    | `too_big` of any other origin | `outOfRange` |
    | `invalid_format`, `format: "email"` | `invalidEmail` |
    | `invalid_format`, any other format (regex, url, uuid) | `invalidFormat` |
    | `not_multiple_of` (the money `step`) | `invalidNumber` |
    | `invalid_value` (enum, literal), `invalid_union` | `invalidChoice` |
    | `custom` with a message the catalog does not know, `unrecognized_keys`, `invalid_key`, `invalid_element` | `invalid` |

    An enum left empty therefore answers `invalidChoice`, not `required`: zod cannot tell "" from a wrong value. Every form's `validate()` reports an empty required select as `required` before the request is sent, so the server's `invalidChoice` only appears for a value the form should never send. `duplicate` never comes from zod; only refusals send it.
  - **S-R3, keys.** The issue path joined with dots; an empty path is `_form`. `issuesToFieldErrors(issues, keyFor?)` keeps the first issue of each key; `keyFor` returning `null` means "use the dotted path" (never "drop the issue"), so no issue is lost. `validationFailedBody(error, keyFor?)` takes the same optional callback (FIXED INTERFACE 2 is unchanged for every caller that passes one argument).
  - **S-R4, settings keys.** `settingFieldKeyFor(submitted)` (in `field-errors.ts`, so tests import it) keys an issue at `["settings", i, …]` by `settings[i].key` of the **submitted** body (trimmed): `settings.asset_label_12_width_mm`. With no usable key (the key itself failed) the dotted path stays (`settings.3.key`). The route keeps the raw body in a `let submitted: unknown = null` declared above `try`, and its catch builds the 400 with that callback before falling back to `errorResponse`.
  - **S-R5, `isPrismaUniqueConstraintError` stays in `src/lib/prisma-unique-retry.ts`** (already shared: `withPrismaUniqueRetry` and its test use it) and `src/lib/field-error-response.ts` re-exports it, so a route imports `isPrismaUniqueConstraintError` and `uniqueConflictResponse` from one module. Moving it would only rewrite three imports.
  - **S-R6, refusals the code throws: `FieldRefusalError`.** `class FieldRefusalError extends Error` in `field-errors.ts`, `constructor(message: string, fieldErrors: FieldErrors, status = 400)`, `name = "FieldRefusalError"`, fields `fieldErrors` and `status` declared in the class body (no TypeScript parameter properties: node's strip-only mode refuses them, and tests import this module). `errorResponse` answers it right after the zod branch and before `isExposableError`: `fieldErrorResponse({ status: error.status, error: error.message, fieldErrors: error.fieldErrors })`. Used where a helper throws today (username, serial number); `throw new FieldRefusalError("…", …)` still matches the catalog test's `new \w*Error("…")` scan.
  - **S-R7, the field codes a refusal sends.** A unique value that exists is `duplicate`; a missing value is `required`; any other refusal sends the catalog key of its own message (`employeeOwnManager`, `locationCycle`, `invalidPermissionSelection`, `pmVendorNotFound`, `invalidAssignee`, `invalidCheckoutCondition`, `statusCorrectionNotNeeded` …), so the message under the field is the specific one the toast shows today. Status stays as today (username and serial 400, branch code 400, role name 409, purchase document 409). A refusal that is about the upload, not a field (the import file rules), goes under `_form`: `required` (no file), `outOfRange` (over 10 MB), `invalidFormat` (not `.xlsx`); the form shows its own form-level message for `_form` (spec §4.1.3).
  - **S-R8, duplicates that ended in a 500.** The six master-data create **and** update routes catch P2002 and answer `uniqueConflictResponse(field, message)`: 409, `code: "DUPLICATE"`, `fieldErrors: { [field]: "duplicate" }`, English message for the catalog (field `code` for company, department, employee, location; `name` for brand and model). Category is checked **before** writing instead (its nested custom-field rows have a unique index of their own, so a P2002 there would be mislabelled as the code): create answers 409 for an **active** duplicate (an inactive one is still brought back, as today), update for any other row with that code (the index covers inactive rows too). The category update is not named by spec §6.2; it is the same 500, so it is in (open issue 1).
  - **S-R9, one body shape.** Every refusal that names fields is `{ error, code?, fieldErrors }`. Bodies that carried more keep them: checkout's `code`, disposal's `code`, the purchase document's `id` (the asset form never reads it on a 409, but the contract keeps it). `uniqueConflictResponse` and the purchase document add `code: "DUPLICATE"`; no client reads `code` on these routes today (they show `payload.error` through `useApiError`).
  - **S-R10, supplier on the shared body.** `src/lib/supplier-api-error.ts` and `tests/supplier-api-error.test.ts` are deleted; the two supplier routes send zod errors through `errorResponse` (the shared 400) and P2002 through `uniqueConflictResponse("code", "Supplier code already exists")`. Until Task 22 (M4) moves the supplier form onto the hook, `parseSupplierFormError` stays and reads the shared codes (`required`, `invalidEmail`, `tooLong`, `duplicate`); `supplier-form.tsx`'s `getErrorMessage` maps them to the same messages as before. The catalog entry `"Invalid supplier data"` and `apiErrors.invalidSupplierData` go (nothing sends them).
  - **S-R11, the widened catalog scan.** `tests/api-error-catalog.test.ts` reads `message: "…"` literals too, over the same files. Three files whose `message:` literals are not error text a form shows get a reasoned exemption, scoped to `message:` only (their `error:` literals are still read): the audit scan route's 202 out-of-scope result, `disposal-bulk-execution-ui.ts`'s selection codes `mixed`/`limit`, and `ldap-auth.ts`'s connection-test results. The recipient message gets `recipientRequired`. No server rule changes (spec §6.3).
  - **S-R12, the asset batch's per-row parse.** Its issues are re-thrown as one `ZodError` whose paths name their place in the request: a field a row sets for itself (`assetTag`, `serialNumber`, `custodianId`, `departmentId`, `currentLocationId`, `homeLocationId`, `remark`) → `rows.<index>.<field>`; any other field → `common.<field>`. The parse site stays `assetSchema.parse(asset)` (the spec's parse-site count does not change). Duplicate serials and tags (in the batch, or already registered) answer the existing Thai message plus `duplicate` under `rows.<i>.serialNumber` / `rows.<i>.assetTag` of **every** row holding a duplicated value, compared as `normalizedKey` does (trim, lower case).
  - **S-R13, the last duplicates and the employee's user account (Task 29a, the user's answers 2 and 3).** Each is checked before any write, so Task 30 can submit it without writing, and answers with the shared body:
    - **Role renamed** to another role's name: the update reads `prisma.role.findUnique({ where: { name: input.name } })` and refuses another role's id with `uniqueConflictResponse("name", "Role name already exists")` (409, the create's message and status); a system role keeps its own name (`existing.isSystem`), so it is not looked up.
    - **Branch code an inactive branch holds:** both lookups drop `isActive: true`, because `@@unique([companyId, code])` (`prisma/schema.prisma:58`) covers inactive branches too; Task 9's Thai message, `code: "duplicate"` and 400 stay.
    - **Two custom fields with one name** (`@@unique([categoryId, fieldName])`, `schema.prisma:482`): the new pure module `src/lib/category-custom-field-names.ts` (LF, a type import of `./field-errors.ts` only) has `duplicateCustomFieldNameErrors(customFieldDefs)`, which puts `duplicate` under `customFieldDefs.<i>.fieldName` of **every** row whose name another row holds, like the batch's rows (S-R12); the routes answer `fieldErrorResponse({ status: 409, error: "Custom field names must be unique in a category", code: "DUPLICATE", fieldErrors })`. The create checks only when it writes the rows (not when it brings back an inactive category with assets or models, which keeps its own rows: the existing condition, now named `writesCustomFields`); the update always, because it replaces the rows. Names compare trimmed and case-folded, as SQL Server's default collations do; the database's collation is not recorded in the repo, so on a case-sensitive collation the check would also refuse two names that differ only in case (the role, branch and client id checks are queries, so they compare as the index does).
    - **Integration client id that exists** (`UX_integration_api_clients_clientId`, `schema.prisma:1066`): the route reads `prisma.integrationApiClient.findUnique({ where: { clientId } })` before `createIntegrationClient` and answers `uniqueConflictResponse("clientId", "Integration client ID already exists")`. The check sits in the route, not in `src/lib/integration-client-store.ts`, because the store loads `./db.ts` itself (a test cannot stand it in), and a `P2002` from that write could also be the token hash's own unique index.
    - **"Employee already has a user account"** throws `FieldRefusalError("Employee already has a user account", { employeeId: "employeeHasUser" })` in both user routes (400 as today; the code is the catalog key, so the form shows `apiErrors.employeeHasUser` under its employee field).
    - Two new catalog keys, `customFieldNameDuplicate` and `integrationClientIdExists`; the role, branch and user refusals keep their messages.

- **R3, the foundation (area F, Tasks 11–18):**

  - **F-R1, the rule helpers (`src/lib/validation-rules.ts`, Task F1).** Pure, LF, a relative `import type { FieldErrorCode } from "./field-errors.ts"` and no other import. Every helper but `required` leaves an empty value (undefined, null, blank text) alone, so an empty optional field is valid.
    - `required(value: unknown)`: `"required"` for undefined, null, blank text, `[]` and `false` (an unticked acknowledgement); `0` is a value.
    - `minLength(value, n)` counts the **trimmed** text (as the disabled gates counted: state review `reason.trim().length < 10`), `maxLength(value, n)` the text **as typed** (as the `maxLength` attribute did).
    - `range(value, min?, max?)`: a number or the text of a number field; text that is not a finite number is `"invalidNumber"`; either bound may be `undefined` or `null`.
    - `email(value)`: the WHATWG `type="email"` pattern on the trimmed value, so nothing the browser accepted before `noValidate` is refused now; a value zod's `z.email()` still refuses comes back from the server as a field error.
    - `pattern(value, re)`: the whole value must match, like the `pattern` attribute (the helper anchors `re`).
    - `notBefore(end, start)`: `"endBeforeStart"` (the catalog key, FIXED 1's "or an api-error catalog key") when `Date.parse(end) < Date.parse(start)`; the same day is fine; an empty side is left to `required`. Hence `export type RuleCode = FieldErrorCode | "endBeforeStart"`.
    - `atLeastOne(values)`: `"required"` unless one value passes `required`.
  - **F-R2, the messages (Task F2).** The 12 FIXED 5 keys plus 5 siblings, because a code from the server carries no limits and next-intl cannot format `{min}` without a value: `tooShortPlain`, `tooLongPlain`, `outOfRangeMin` (`{min}` only), `outOfRangeMax` (`{max}` only), `outOfRangePlain`. Wording (Thai first, each says what is wrong or what to do, glossary words only; `required` says ระบุ, which fits typing and choosing): the table in Task F2's change file. `common.required` and `apiErrors.endBeforeStart` stay (pinned elsewhere); `common.validation.endBeforeStart` reads ≥ ("ต้องไม่ก่อน"), matching the client rule and the server's `audit.ts` rule. Keys +17: 4074 → 4091 in this plan's chain, after area S's catalog keys (A-R6).
  - **F-R3, one resolver (Task F2).** `resolveValidationMessage(code, params, { validation, apiErrors })`: `common.validation.<validationMessageKey(code, params)>` if it exists, else `apiErrors.<code>` (a custom server code is its catalog key, e.g. `licenseSeatsExceeded`), else `common.validation.invalid`. `validationMessageKey` picks the sibling: `tooShort` needs `min`, `tooLong` needs `max`, `outOfRange` both (else `outOfRangeMin` / `outOfRangeMax` / `outOfRangePlain`); every other code is its own key. It lives in a new pure module `src/lib/field-error-client.ts` (not a FIXED file), so tests import it; the hook wraps it with `useTranslations("common")` (`tCommon.has(\`validation.${key}\`)`) and `useTranslations("apiErrors")`.
  - **F-R4, the hook contract (Task F4; amends FIXED 3 by one optional argument).**
    - `useFieldErrors<K>(options?: { params?: Partial<Record<K, ValidationParams>> })`: `params` names each field's limits for its message; without it the message is the plain sentence. FIXED 3's call `useFieldErrors<K>()` still works.
    - `setErrors(next)` replaces the map (a new submit recomputes everything, spec §4.3). A ref holds the latest map, so `focusFirst` right after `setErrors` in the same handler sees it.
    - `applyServer(payload): boolean`: **true when the body names at least one key** (any key, `_form` and keys the form does not render included); those errors replace the form's. It does not know the form's keys: `focusFirst` decides whether one of them is shown. So the caller writes `if (applyServer(payload) && focusFirst(ORDER, …)) return`, and when the server named no shown field the request falls through to today's form-level message (spec §4.1.3).
    - `focusFirst(order, { idFor?, reveal? }): boolean`: true when a key of `order` has an error; `_form` is never in an order. The focus runs in an effect after the render that shows the errors (so the field is read with its new `aria-describedby`): `await reveal?.(key)`, then `waitForElement(idFor?.(key) ?? key)` (up to 30 frames: a settings tab mounts its panel after the switch, a review dialog unmounts first), then `focusField`. The default id is the key itself; forms pass `idFor` with their prefix (`supplier-code`).
    - `clear(...keys)`: removes those keys; the same map (no render) when none is set. A pair or a group passes all of its keys (spec §4.3).
    - `message(key)`: the resolved text of the key's code, or `undefined`; `message("_form")` is there for a form that shows a form-level line.
    - The hook has no toast and no `useApiError` (U2): a catch keeps its own.
  - **F-R5, focus and scroll (Task F3; spec §4.1, §4.2).** `focusField(target)`: opens every closed `<details>` above the target; picks the control (the target itself, or for a group its checked radio, else its first enabled control); blurs it first when it already has focus (so a screen reader reads the new error after Enter in that field); `focus()`; then, inside `<main data-dashboard-main>`, scrolls `main` with `behavior: "auto"` (no smooth scroll, so reduced motion needs nothing) by `fieldScrollTop`: the field from its label (`label[for=id]`, the `[data-slot="field"]` or `[data-slot="field-group"]` wrapper) to its error line (`${id}-error`) shows whole, 24px clear of the top edge and of the `[data-slot="sticky-form-footer"]` bar (its height is the covered strip); a field taller than the room is aligned by its top; never below 0. Outside `main` (dialogs and sheets are portalled) the browser's own scroll on focus is kept. Rehearsed in Chromium (Playwright, a mock shell: 64px topbar, scrolling `main`, 30 fields, a sticky 72px bar, a closed `<details>`, a fieldset): from the top, field 12 was focused at 383px with 279px to the bar, field 29 with 89px, the field behind the bar with 40px, the `<details>` field opened and focused, the fieldset focused its first checkbox.
  - **F-R6, one announcement per submit (Task F5; spec §7.3, G5).** `FieldError` loses `role="alert"`: after a submit the focused field is read with its error through `aria-describedby`, and the other errors are read as the person reaches them. `Field liveError` (boolean) is the polite path for errors shown while typing (U8): Field renders an always-present `<span data-slot="field-error-live" className="sr-only" aria-live="polite">{error}</span>` (a live region that exists before its text changes is read reliably; one inserted with its text is not), and the visible error line gets `aria-hidden` so reading mode does not hear it twice (`aria-describedby` still reads hidden text). The asset form's two duplicate fields take `liveError` in F5, so they keep an announcement until the assets plan moves that form. `SearchableSelect` renders the same `FieldError` and follows the rule. Never `role="alert"` or `aria-live="assertive"` on a field error.
  - **F-R7, the SearchableSelect invalid state (Task F6; spec §7.3, §10 "builder's call").** No `aria-invalid` on the trigger: it is a `<button>` (jsx-a11y `role-supports-aria-props`, and `tests/field-primitives.test.ts:117` forbids it). The trigger carries `data-invalid` (`data-invalid={error ? true : undefined}`) and the constant `triggerInvalidClasses` from `field-variants.ts`: the danger border, ring and halo, and the teal ring back while focused **or open**. Compile evidence (`@tailwindcss/node` with the repo's Tailwind): the rules come out `focus:border-ring` (163) < `aria-expanded:border-ring` (168) < `data-invalid:border-danger` (185) < `data-invalid:focus:border-ring` (190) < `data-invalid:aria-expanded:border-ring` (197), so a plain `data-invalid:` class beats focus and open, and the two compound rows are needed. The classes live in `field-variants.ts`, the GF3 owner: the same string in `searchable-select.tsx` would be a hand-written field class string (it contains `focus:border-ring`). The error stays tied by `aria-describedby`, read after the label and the value. The id stays the caller's `id` (the stable id focus needs); `MaintenanceOptionSelect` and `AuditScanCheckField` gain `id?: string` and `error?: React.ReactNode` and pass both on.
  - **F-R8, groups (Task F7; spec §7.3).** A new server-safe part `FieldGroup` (`src/components/ui/field-group.tsx`, LF): the `<fieldset className="min-w-0">` + `<legend className={cn(fieldLabelClasses, "mb-1.5")}>` markup the forms use today, plus the star, an id, `data-slot="field-group"` (the focus helper measures it), `aria-describedby` (error, then hint) on the fieldset, and the error line under the group (`${id}-error`, `mt-1.5`). Focus goes to the group's checked radio or first control (F-R5). ChoiceCard and ChoiceChip get no red border: a red frame on every option would read as every option being wrong; a checkbox may take `aria-invalid` from its caller (a radio may not: jsx-a11y). `Segmented` always holds one value, so it has no error to show. `FileDropzone` goes through `Field`, which already passes `aria-invalid` and gives it the danger border.
  - **F-R9, the V guards (Task F8; spec §8, FIXED 7).**
    - `V_SCOPE` is the 51 forms of spec §5 by the file that holds each form's submit (44 files; `asset-component-manager`, `audit-finding-review-actions`, `repair-record-actions`, `system-settings-form` and `IntegrationClientManager` hold several). V1 fails when a non-search `<form>` anywhere in `src` is in neither `V_SCOPE` nor `NOT_IN_SCOPE`, or a file holds more `<form>`s than its row counts, and checks the sum is 51. `NOT_IN_SCOPE`: the login form (spec §3, §5) and `ui/confirm-text-dialog.tsx` (a shared part; its caller `audit-findings-batch-actions.tsx` is in the scope).
    - `V_FORMS` starts empty; a form task adds its file in the commit that moves the file's last form. V2: `validate(` in the file and every `<form>` with `noValidate` directly after its `onSubmit={…}` (not necessarily the first attribute: `IntegrationClientManager`'s create form starts with `className`); a formless submit (status correction, data-quality rule, report preset, …) needs only `validate(`. V3: no `toast.error(`/`toast.warning(` outside a catch. V4: every required select has `id=` and `error=`.
    - "Outside a catch" (the reader, `linesOutsideCatch`): not inside the block of `catch {` / `catch (e) {`, and not inside the argument of `.catch(…)`. Braces in one-line strings are skipped; JSX comments and line-leading block comments are blanked before `<form>` is read (two comments name `<form>`), and `accept="image/*"` is left alone.
    - `SELECT_STAR_ONLY` (V5): the exact count per file of required selects with no `error=` (14 in 10 files once Task 16 has run; 16 in 12 at `71e5251`, while the two wrappers' own selects still lack `error=`); a row drops in the commit that gives its selects their errors, a new one fails, and a `V_FORMS` file cannot hold one. None is in a plan-1 form.
    - For later plans (not plan 1): V3 also bans the non-validation toasts outside a catch that four later forms hold (the upload-result warnings of `disposal-request-form.tsx`, `disposal-batch-form.tsx`, `repair-record-form.tsx`, `repair-record-actions.tsx`, and the batch duplicate-check result `asset-batch-form.tsx:522`). Each of those plans moves them into the catch or a status line, or adds an allowance list to this file with its own ruling; area F adds none (never a row without a ruling).
  - **F-R10, FMG stays as it is.** `STAR_ONLY`'s three entries belong to the checkin form and the asset form (later plans), and GF4's `vTrack` rule already accepts a moved form's star without native `required`; F edits no FMG list. `CONSTRAINT_FLOORS` holds: no F task removes an attribute.

- **R4, the forms (area M, Tasks 19–29):**

  - **M-R1 The field table.** Every migrated form declares, at module level and in visual order, `const FIELD_IDS = { <key>: "<form>-<field>", … } as const`, `type <Form>Field = keyof typeof FIELD_IDS` and `const FIELD_ORDER = Object.keys(FIELD_IDS) as <Form>Field[]`. A key is the name the server uses in `fieldErrors` (the request body's key: `companyId`, not `company`); the id goes on the `Field` (`id="company-code"`), so `Field` hands it to the control and names the error `${id}-error`. The table lists every key a client rule or the server can name, and only those (department's company and the `isActive` checkboxes have no rule anywhere and stay out). Supplier keeps its six ids (`supplier-contact` for `contactPerson`), which its test pins. A form with two forms (integration) has two tables, `CREATE_FIELD_IDS` and `EDIT_FIELD_IDS`. The category rows (M-R7) and the data-quality severities (M-R12) build their keys and ids with a function.
  - **M-R2 `validate()`.** One module-level `function validate(values…)` per file returns `Partial<Record<<Form>Field, string>>`, built with a local `const check = (key, code: string | null) => { if (code) errors[key] = code }` and one `check(...)` line per field. Rules chain with `??` in the order `required` → `minLength` → `maxLength` → `pattern` / `email`; `atLeastOne` for a group. It restates every constraint the control carries (`required`, `minLength`, `maxLength`, `pattern`, `type="email"`) and, where the client had none, the server's rule for that field (role key length 2–50, at least one role, at least one scope, a photo checklist item is not empty) — never a rule the server does not have (spec §3 non-goal). The HTML attributes stay as they are (spec §4.5; FMG `CONSTRAINT_FLOORS` unchanged). A select that always holds a valid option still gets `required` when its control is `required` (employee status, location type). The comment above it says what it restates.
  - **M-R3 The hook contract area M uses** (FIXED 3 left it to F; it is F-R4's, checked against Task 14's hook in A-R2):
    - `setErrors(next)` and `applyServer(payload)` take effect at once for `focusFirst` in the same tick (a ref), and render on the next one;
    - `focusFirst(order, { idFor })` returns `true` when a key of `order` has an error now, and moves focus to the first one after the render (F's focus/scroll helper keeps it clear of the sticky footer and the topbar); `false` otherwise;
    - `applyServer(payload)` sets the errors to every key of `payload.fieldErrors` (`_form` and keys the form does not show included) and returns `true` when it set at least one; with no `fieldErrors` it changes nothing and returns `false`;
    - `message(key)` is the resolved text of the key's code, `undefined` without an error; `clear(...keys)` is a no-op for a key without an error;
    - the rule helpers return `null` for an empty value, except `required` and `atLeastOne` (so `required(v) ?? maxLength(v, n)` reads "required, else not too long", and an optional field writes only `maxLength(v, n)`).
  - **M-R4 The submit sequence and the messages.** `event.preventDefault()` → (a prerequisite `return`, M-R10) → `fieldErrors.setErrors(validate(values))` → `if (focusFirstError()) return` → `setSaving(true)` and the request → on `!response.ok`: `if (fieldErrors.applyServer(result) && focusFirstError()) return`, then today's `throw new Error(result?.error ?? tCommon("error"))`, so a refusal that names no field of the form keeps today's toast through the catch's `apiError.toast` (spec §4.1 step 3) and every other failure keeps today's handling (step 4). `const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })` sits in the component. Under each `Field`: `error={fieldErrors.message("<key>")}`, except a field with a minimum length, which says its numbers: `error={fieldErrors.errors.<key> ? validationMessage(fieldErrors.errors.<key>, { min: N, max: M }) : undefined}` with `const validationMessage = useValidationMessage()` (password 8–100, role key 2–50, client id 3–100, review reason 10–2000). The report preset keeps its own "required" text (`labels.presetNameRequired`, spec §7.1: a form may use its domain message).
  - **M-R5 Field markup and clearing.** The opening tag reads `<Field label={…} id="…" [required] [hint={…}] [className=…] error={…}>`: `id` straight after `label` (supplier's existing order), `error` last; a tag that would pass about 120 characters goes one prop per line (password, role key, client id, review reason, preset name). `setField` (and role's `setMetaField`) clears the key it sets when the key is in the table: `if (field in FIELD_IDS) fieldErrors.clear(field as <Form>Field)`. Brand, which wrote `setValues` inline, gets the same `setField`. A pair or group clears together (spec §4.3): employee's company change clears `companyId`, `branchId`, `departmentId`; a role toggle clears `roleIds`; a permission toggle (one or a module) clears `permissionIds`; a scope toggle clears `scopes`. Opening the integration edit dialog starts with no errors (`editErrors.setErrors({})`).
  - **M-R6 Supplier.** The form drops its own error state, `getErrorMessage`, the `parseSupplierFormError` import and the validation toast, and uses the hook and the shared codes like the others (spec §6.1 last bullet). `supplier.duplicateCode`, `supplier.invalidEmail` and `supplier.fieldTooLong` lose their only reader and go (`common.validation.duplicate` / `invalidEmail` / `tooLong` say the same). `src/lib/supplier-form-errors.ts` belongs to S: Task 22 (M4) deletes it and `tests/supplier-form-errors.test.ts`, because after Task 7 deleted `src/lib/supplier-api-error.ts` the form was its last importer, and cuts the end of Task 7's test that loads it (A-R4). (In M's rehearsal the stand-in kept `supplier-api-error.ts`, so both stayed there.)
  - **M-R7 Category rows.** Keys `customFieldDefs.<row>.fieldName` / `.fieldLabel` / `.fieldLabelTh` and `photoChecklist.<row>` (spec §6.1); ids `category-field-<row>-name` / `-label` / `-label-th` and `category-photo-<row>`; focus order: the three fixed fields, then each custom field row, then each photo row (`fieldOrder(values)`, `fieldId(key)`). An edit of a row's field clears that key; removing, copying or moving a row clears every error of that template, because the rows below it shift. An empty photo checklist item is an error (the server refuses it, `validations/category.ts:22`); no star is added (the field has no visible label).
  - **M-R8 Groups.** A set of checkboxes with one rule (admin roles, role permissions, integration scopes) is one labelled group — `role="group"` with `aria-labelledby`/`aria-label`, or the existing `<fieldset>` — whose `aria-describedby` names one `FieldError` (`@/components/ui/field`, exported) with the id `<group-id>-error`, shown under the group (above the permission table, whose rows can be long). Focus goes to the group's first checkbox, which carries the table's id (`id={index === 0 ? "admin-user-roles" : undefined}`). F ships `FieldGroup` (F-R8, Task 17): the integration scopes use it (A-R3); the admin roles and the role permissions keep the markup above, because the roles are a `<section>` with its own heading and the permissions' error sits above a long table, which `FieldGroup` (error under the group) does not do.
  - **M-R9 Dialogs.** The integration edit dialog shows its field errors in the dialog and keeps its error Notice for every other failure. The state review dialog's `onSubmit` now resolves to the server's body when the workspace sees `code === "VALIDATION_FAILED"` with `fieldErrors` (the workspace returns it instead of toasting), else to nothing; the dialog applies it, so the error lands under its field with the dialog still open, and the `_form` key (the server's "a status or condition target is required", its strict-schema extra key) shows in a danger `Notice role="alert"` at the top of the dialog body (DESIGN.md: an error of a dialog's action shows inside the dialog). On these two routes every `VALIDATION_FAILED` names `reason`, `statusId`, `conditionId` or `_form` (the dialog never sends an empty id), so nothing fails silently. The stale conflict keeps its toast.
  - **M-R10 Prerequisite gates** (spec §4.4, §11 call 2): branch without any company and location without any branch keep their gate. `const needsCompany = companies.length === 0` (`needsBranch` for location); `handleSubmit` returns first when gated (Enter in a field still submits the form); the button is `aria-disabled={needsCompany || undefined} aria-describedby={needsCompany ? "branch-save-reason" : undefined}` instead of `disabled` (it stays focusable; Button's `aria-disabled:` styles look disabled and drop pointer events); the reason is visible next to the buttons: `<p id="branch-save-reason" className="basis-full text-meta text-muted-foreground sm:mr-auto sm:basis-auto sm:self-center">` (a line of its own on a phone, left of the buttons from `sm`), and the footer row gains `flex-wrap`. New messages `branch.saveNeedsCompany`, `location.saveNeedsBranch`.
  - **M-R11 Content gates become errors** (spec §4.4): the review reason's 10 characters (the disabled button goes) and the integration scopes' "at least one" (the silent keep-the-last rule in both toggles and the edit dialog's disabled save go). Their buttons are enabled; `validate()` says it on submit.
  - **M-R12 The two button-only forms** (spec §4.5, §8: every form of the scope has `noValidate` and `validate(`): the data-quality rules and the report preset name become `<form onSubmit={handleSubmit} noValidate …>` with a `type="submit"` button. The data-quality form's one rule is that a severity is one of its two choices (`invalidChoice`; the select offers only those, so it is the form's whole rule, not a new one); its keys are `<rule>.severity`, its ids `data-quality-severity-<rule>`; its bare `catch` becomes `catch (error) { apiError.toast(error) }` with the server's `error` thrown on `!ok` (spec §5 bug). The preset name saves on this device only, so it has no server step; its row aligns to the top (`sm:items-start`) and the button keeps its place with `sm:mt-6.5` (the label row 20px plus the gap 6px), so an error under the name does not push the button down; the danger Notice under the row stays for the storage failure, which is not a field error.
  - **M-R13 Integration's own failures.** Create and edit read the body on `!ok`; a refusal that names no field shows the server's reason, described like every other server error: `throw new Error(apiError.describe(result?.error ?? labels.createFailed).message)` (`labels.actionFailed` for edit) into the existing Notice. Rotate, enable, disable and the list load are not forms and keep their fixed texts.
  - **M-R14 Tests.** One new LF file, `tests/v-track-m.test.ts`, one test per task, appended in order; M1 creates it with the shared helpers `read`, `escape`, `validateBody` and `assertMigratedForm`. Tests read `.tsx` as text (they cannot import it) and pin the decisions: `noValidate` straight after `onSubmit`, the table, the rules, the ids, the messages, the server path, no validation toast. Each task adds its form to `V_FORMS` and edits, in the same commit, every existing pin its change breaks (each Step 4 lists them exactly).

- **R5, assembly decisions** (where two area drafts touched the same thing, or the shared contract moved):
  - **A-R1, numbering.** S1–S10 are Tasks 1–10, F1–F8 Tasks 11–18, M1–M11 Tasks 19–29, S11 Task 29a (added after the dry run on the user's answers, placed after Task 29 so no number moves); Task 0, Task 30 and Task 32 are the controller's, Task 31 the docs. Test names keep the area ids as rehearsed ("(v-track M4)", "(V spec §6.1)"); commit messages carry both: "(v-track plan 1 task 22, M4)". The areas' `<temp>` paths are unified: `<temp>` is the `v-plan` folder (M's draft meant the scratchpad above it, so its paths lost their `v-plan/` segment).
  - **A-R2, the hook contract M assumed (M-R3) is F's (F-R4), checked line by line against Task 14's rehearsed hook** (`<temp>/sim-F` `2d0a4f43`): `setErrors` writes `errorsRef` first, so `focusFirst` in the same handler sees it; `applyServer` is false and changes nothing when `readFieldErrors` finds no string code, else it replaces the map with every key (`_form` included) and is true; `focusFirst` is true when a key of `order` has an error and focuses in the effect after the render; `clear` with no such key keeps the same map; `message(key)` without `params` reads the plain sentence. M's forms call `useFieldErrors<K>()` without `params`: a `tooLong` reads `common.validation.tooLongPlain`, which is enough because the `maxLength` attribute stops typing past the limit, so a `tooLong` comes only from the server, whose code carries no limit either; the minimum lengths say their numbers through `useValidationMessage` (M-R4). M-R3's last point holds: `required` and `atLeastOne` are the only helpers that answer an empty value.
  - **A-R3, `FieldGroup` (F7) carries the integration scopes; the roles and the permissions keep M-R8's markup.** F-R8 built `FieldGroup` from exactly the markup of the two integration scope fieldsets (`c/admin/IntegrationClientManager.tsx:419-420`, `:472-473`), and M-R8 left the move to the assembly. Task 27 (M9) writes `<FieldGroup legend={labels.scopes} id="integration-scopes" className="lg:col-span-2" error={createErrors.message("scopes")}>` and `<FieldGroup legend={labels.scopes} id="integration-edit-scopes" error={editErrors.message("scopes")}>`: the id is the fieldset's, focus goes from the group to its first checkbox (F-R5's `focusableIn`), and the focus helper measures the whole group (`data-slot="field-group"`). `FieldError`, `fieldLabelClasses` and the first checkbox's `id={index === 0 ? … }` leave that file. The admin roles (Task 25, M7) are a `<section>` with its own heading, not a field legend, and the role permissions (Task 26, M8) need their error above a long table, which `FieldGroup` (error under the group) does not do: both keep `role="group"` with one `FieldError` (M-R8). Checked in the assembly check (`asm-m9`, header): the M9 test, the `:244` pin and 12 related files pass, full `npm test` unchanged, `tsc` and eslint clean; `IntegrationClientManager.tsx` is 887 lines (M's draft 896).
  - **A-R4, the supplier hand-off (S-R10 → M-R6).** Task 7 (S7) deletes `src/lib/supplier-api-error.ts`, keeps `parseSupplierFormError` reading the shared codes, and rewrites the three `if (code === …)` lines of `supplier-form.tsx`'s `getErrorMessage`. Task 22 (M4) then removes the form's parser use and `getErrorMessage`, so nothing in `src` imports `src/lib/supplier-form-errors.ts` any more (M-R6's condition holds by construction): Task 22 deletes it and `tests/supplier-form-errors.test.ts` (2 tests) and cuts the end of Task 7's test, which loads the parser and pins `getErrorMessage` (old and new strings in Task 22's Step 4). Task 22's Verify no longer names `tests/supplier-api-error.test.ts` (Task 7 deleted it). Its count is +1 − 2 = −1.
  - **A-R5, the `V_FORMS` edits.** Task 18 writes `const V_FORMS: readonly string[] = []`. Task 19 (M1) replaces that line (old, exact) with the four lines `const V_FORMS: readonly string[] = [` / `` `${C}master-data/brand-form.tsx`, `` / `` `${C}master-data/company-form.tsx`, `` / `` `${C}master-data/department-form.tsx`, `` / `]` (rows indented two spaces); every later M task inserts its rows directly before that `]`, in the order its Step 4 names. After Task 29 `V_FORMS` holds 15 files with the 16 forms of plan 1 (Task 27's file holds the create form and the edit dialog; the state review workspace holds no form and is not listed). None of the 15 has a `SearchableSelect`, `MaintenanceOptionSelect` or `AuditScanCheckField` (counted at `71e5251`: 0 call sites in each), so V4 holds for them without a `SELECT_STAR_ONLY` change.
  - **A-R6, counts.** `npm test` chain estimates (tests; pass one fewer, 0 fail, 1 skipped): base 2226 · Tasks 1–6: 2227 … 2232 · Task 7: 2229 (+1, −4) · Tasks 8–10: 2230 … 2232 · Tasks 11–17: 2233 … 2239 · Task 18: 2245 (+6) · Tasks 19–21: 2246 … 2248 · Task 22: 2247 (+1, −2) · Tasks 23–29: 2248 … 2254 · Task 29a: 2255 · Task 31: 2256. Messages (leaf keys per locale): 4067 · Task 3: 4068 · Task 7: 4067 · Task 8: 4074 · Task 12: 4091 · Task 20: 4093 · Task 22: 4090 · Task 29a: 4092. The dry run filled every task count; the areas' rehearsal numbers ran on other bases (F on `71e5251` with a stand-in, M on a stand-in for S and F), so a task's own number moved, not its delta. Every number here held on the whole chain in the dry run (and 2255 tests after Task 31 on `v-dry`); Task 29a, rehearsed after the dry run, held 2255 after itself and 2256 after Task 31.
  - **A-R7, shared files, when each task runs:** `src/lib/field-errors.ts` Tasks 1, 2, 4; `src/lib/api-error-catalog.ts` Tasks 3, 7, 8, 29a; `messages/*.json` Tasks 3, 7, 8, 12, 20, 22, 29a; `src/app/api/assets/[id]/checkout/route.ts` Tasks 6, 10 (other lines); `employees/[id]` and `locations/[id]` routes Tasks 8, 9 (Task 9 widens Task 8's import line instead of adding a second one); the category routes Tasks 8, 29a and `admin/roles/[id]` Tasks 9, 29a (Task 29a widens their import lines the same way), the user and branch routes Tasks 9, 29a; `c/master-data/supplier-form.tsx` Tasks 7, 22; `tests/supplier-form-ui.test.ts` Task 15 (the `:18` comment, in place) and Task 22 (`:17`, `:24`, `:40`); `tests/v-track-s.test.ts` Tasks 1–10, 22 and 29a; `tests/field-primitives.test.ts` Tasks 15, 16; `c/assets/asset-form.tsx` Task 15 only; `tests/validation-guards.test.ts` Task 18, then Tasks 19–29 (`V_FORMS`); `tests/master-data-sweep-ui.test.ts` Tasks 19, 22, 24.
  - **A-R8, the dev-app check never writes.** M's draft named "a duplicate company or brand code on create (the 409 comes before any write)" as a check; Task 8 answers those six from Prisma's `P2002`, which the database raises during the INSERT or UPDATE: that is a write attempt, so Task 30 does not submit them (Task 8's test covers them). Task 30 submits only refusals the server makes before it writes: the zod 400s, the category's active duplicate (checked first, S-R8), an existing role key, an existing username, an existing branch code, an employee as their own manager, a location as its own parent, the state review's **resolve** with a valid reason and no target (the schema's `refine`, `_form`; never its **dismiss**, which writes on a valid reason), Task 29a's role renamed to another role's name, two custom field rows of one name and an employee who already has a user account, and the integration create with no scope (refused by the client, so no request). Task 30 Step 5 holds the exact list with the route lines.
  - **A-R9, open issues merged.** S's open issues 2 and 3 and M's M-a name the same refusals; they are one list in "Open issues" at the end (items 1–4), with F-a (item 5), M-b widened to every duplicate a plan-1 form shows (item 6), and the final review's Enter-to-save (item 7). None blocks execution; each default is what the tasks write. The user answered all seven on 2026-10-17 ("The user's answers" at the end): answers 2 and 3 became Task 29a (S-R13); the other defaults stand.
  - **A-R10, the review notes stay with their areas.** S's "Review Focus (area S)" became "Review notes (area S)" inside area S; the plan's Review Focus below names five failure modes across the areas, each held by a test in its owning task.
  - **A-R11, FMG `STAR_ONLY` and the select countdown.** FIXED 7's "FMG STAR_ONLY shrinks as asterisk-only selects get error=" belongs to the later plans: FMG's three `STAR_ONLY` entries (the checkin return date, the asset form's license seats and component role) and V5's 14 `SELECT_STAR_ONLY` selects are all in later-plan forms (F-R9, F-R10). Plan 1 changes neither list; each later plan shrinks them in the commit that gives those selects their errors.

## Review Focus

Five failure modes that would bite a person. Each is held by assertions in its owning task's Step 1 block, and Task 30 checks it on the app.

1. **A server refusal that names no field the form shows fails silently, or shows twice (Tasks 14, 19–29).** If `applyServer` returned true for a body whose keys the form does not render (`_form`, `rows.3.serialNumber`), and the caller returned on it alone, the person would see nothing; if the form also kept its toast, the person would see the error twice. **Tests:** Task 14 (F4) pins `firstErrorKey` ignoring `_form` and unknown keys and `readFieldErrors` returning null for a body without string codes; every M test's `assertMigratedForm` requires `if (<hook>.applyServer(<body>) && ` (the short circuit through `focusFirst`) and no `toast.error`/`toast.warning` in the file; Task 28 (M10) pins that the workspace hands back only `VALIDATION_FAILED` with `fieldErrors` and keeps the stale conflict's toast. Task 30: one refusal per form that names no field (the `_form` of the state review, a forced 400 through the console).
2. **Raw zod text, a snake code or an unexpected error reaches the person (Tasks 1, 2, 12).** A `fieldErrors` value that is zod's English message, a 500 that leaks a Prisma message, or a code with no message would put developer text under a field. **Tests:** Task 1 (S1) runs real zod 4.4.1 schemas through the map (every code the repo's schemas raise, a catalog message on a built-in check, a custom message no catalog knows, `unrecognized_keys`) and pins that anything else is `invalid`, never the issue's message (`invalid_key` and `invalid_element`, which no schema here raises, take the same `invalid` branch of S-R2); Task 2 (S2) pins the hidden 500 with its reference for an uncaught `P2002` and that Integration v1 has no `fieldErrors`; Task 12 (F2) resolves an unknown code to `common.validation.invalid` and every shared code to its own sentence in both locales.
3. **Focus runs before the error renders, or lands under the save bar (Tasks 13, 14).** A field focused before React renders its error is read without it; one scrolled "into view" behind the sticky footer or the topbar leaves the person looking at no error. **Tests:** Task 13 (F3) pins `fieldScrollTop` for each case (above, behind the bar, below, taller than the room, never below 0) and the selectors of `data-dashboard-main`, the save bar, the label and the error line; Task 14 (F4) pins `errorsRef.current = next`, the effect on `focusRequest`, `reveal` then `waitForElement`. Task 30: every plan-1 form at 1440 and 375, the focused field's error read by the accessibility tree and its box clear of the bar.
4. **Five alerts at once, or a live error that is never read (Task 15).** `FieldError` with `role="alert"` reads every error of a submit at once (anti-goal); removing it without a live path silences the asset form's duplicate checks (U8). **Test:** Task 15 (F5) pins `FieldError` without a role, no `assertive` anywhere in `field.tsx`, the always-present polite `field-error-live` region with the visible line `aria-hidden`, and exactly two `liveError` uses in the asset form. Task 30: the accessibility tree after one empty submit shows one focused field with its description and no alert.
5. **A moved form brings a validation toast or the browser's bubble back (Task 18, every M task).** A later edit that adds `toast.error(...)` for a validation rule, drops `noValidate`, or adds a `<form>` outside the scope would undo G1 without a failing feature test. **Tests:** Task 18 (F8) V1 (every non-search `<form>` in `src` is in `V_SCOPE` or `NOT_IN_SCOPE`, 51 in all), V2 (`validate(` and `noValidate` after `onSubmit`), V3 (no toast outside a catch, with the reader's own test of catch blocks, `.catch()` handlers and strings with braces), V4, V5; each M task adds its files to `V_FORMS`. Task 30: no native bubble and no toast on any plan-1 form's invalid submit.

## File structure

| File | What changes | Task |
|---|---|---|
| `src/lib/field-errors.ts` (new) | `FORM_ERROR_KEY`, the types, `fieldErrorKey`, `issueToFieldErrorCode`, `issuesToFieldErrors` · `FieldRefusalError` · `settingFieldKeyFor` | 1 · 2 · 4 |
| `src/lib/field-error-response.ts` (new) | `fieldErrorResponse`, `uniqueConflictResponse`, re-exported `isPrismaUniqueConstraintError` | 2 |
| `src/lib/api-error-exposure.ts`, `src/lib/api-response.ts` | `fieldErrors` in the 400; `FieldRefusalError` answered | 2 |
| `src/lib/api-error-catalog.ts` | `recipientRequired` · `invalidSupplierData` goes · seven duplicate keys · `customFieldNameDuplicate`, `integrationClientIdExists` | 3 · 7 · 8 · 29a |
| `src/app/api/admin/settings/route.ts` | keys by setting | 4 |
| `src/lib/asset-batch-create.ts`, `src/app/api/assets/batch/route.ts` | row and common keys, duplicates per row | 5 |
| `src/app/api/assets/[id]/checkout/route.ts` | `HANDOVER_*` with `fieldErrors` · the condition refusal | 6 · 10 |
| `src/app/api/disposal-requests/[id]/route.ts`, `src/lib/disposal-api-errors.ts` | the evidence branch with `fieldErrors` | 6 |
| `src/app/api/suppliers/route.ts`, `…/[id]/route.ts`, `src/lib/supplier-form-errors.ts`; `src/lib/supplier-api-error.ts` (deleted) | the shared body and codes | 7 |
| 12 master-data routes (`companies`, `departments`, `employees`, `locations`, `brands`, `models`, create and update), both category routes | 409 `DUPLICATE` under the field | 8 |
| `src/app/api/admin/users/**`, `admin/roles/**`, `branches/**`, `employees/[id]`, `locations/[id]` | field refusals with `fieldErrors` | 9 |
| `src/app/api/assets/route.ts`, `assets/[id]/route.ts`, `purchase-documents/route.ts`, `assets/[id]/status-correction/route.ts`, `maintenance-plans/route.ts`, `notifications/route.ts`, `assets/import-preview/route.ts`, `assets/import-confirm/route.ts` | field refusals with `fieldErrors`, the import rules under `_form` | 10 |
| `src/app/api/admin/roles/[id]/route.ts`, `admin/users/**`, `admin/integration-clients/route.ts`, `branches/**`, both category routes; `src/lib/category-custom-field-names.ts` (new) | the role rename, an inactive branch's code, the custom field names, the client id and the employee's user account under their field | 29a |
| `src/lib/validation-rules.ts` (new) | the eight rule helpers | 11 |
| `src/lib/field-error-client.ts` (new) | `validationMessageKey`, `resolveValidationMessage` · `readFieldErrors`, `firstErrorKey`, `withoutKeys` | 12 · 14 |
| `messages/th.json`, `messages/en.json` | the keys of "Messages" | 3, 7, 8, 12, 20, 22, 29a |
| `src/lib/field-focus.ts` (new) | `fieldScrollTop`, `focusField`, `waitForElement` | 13 |
| `c/ui/use-field-errors.ts` (new) | `useFieldErrors`, `useValidationMessage` | 14 |
| `c/ui/field.tsx`, `c/assets/asset-form.tsx` | `FieldError` without a role, `Field liveError` · the two duplicate fields | 15 |
| `c/ui/field-variants.ts`, `c/ui/searchable-select.tsx`, `c/maintenance/maintenance-option-select.tsx`, `c/audit/audit-scan-check-field.tsx` | `triggerInvalidClasses`, `data-invalid`, `id` and `error` passed on | 16 |
| `c/ui/field-group.tsx` (new) | `FieldGroup` | 17 |
| `tests/validation-guards.test.ts`, `tests/helpers/validation-reader.ts` (new) | the V guards and their reader · `V_FORMS` rows | 18 · 19–29 |
| `c/master-data/brand-form.tsx`, `company-form.tsx`, `department-form.tsx` | errors under the field | 19 |
| `c/master-data/branch-form.tsx`, `location-form.tsx` | errors, the gate with its reason | 20 |
| `c/master-data/employee-form.tsx` | errors | 21 |
| `c/master-data/supplier-form.tsx`; `src/lib/supplier-form-errors.ts`, `tests/supplier-form-errors.test.ts` (deleted) | onto the hook | 22 |
| `c/master-data/category-form.tsx` | errors, the template rows | 23 |
| `c/master-data/asset-model-form.tsx` | errors | 24 |
| `c/admin/admin-user-form.tsx` | errors, the role group | 25 |
| `c/admin/role-permission-form.tsx` | errors, the permission group | 26 |
| `c/admin/IntegrationClientManager.tsx` | create and edit, the scope `FieldGroup`s, the server's reason | 27 |
| `c/admin/asset-state-review-dialog.tsx`, `asset-state-review-workspace.tsx` | the reason on submit, the refusal back to the dialog | 28 |
| `c/admin/data-quality-rule-form.tsx`, `c/reports/report-preset-controls.tsx` | real forms, the server's reason | 29 |
| `tests/v-track-s.test.ts`, `tests/v-track-f.test.ts`, `tests/v-track-m.test.ts` (new) | one test per task | 1–10, 29a (and 22) · 11–17 · 19–29 |
| `tests/api-error-exposure.test.ts` · `tests/api-error-catalog.test.ts` · `tests/supplier-form-errors.test.ts` (Task 7; deleted in 22); `tests/supplier-api-error.test.ts` (deleted) | pins of the body, the catalog scan, the supplier codes | 2 · 3 · 7 |
| `tests/field-primitives.test.ts`, `tests/asset-forms-ui.test.ts`, `tests/supplier-form-ui.test.ts` | pins of `FieldError`, `Field`, the select's error class, the duplicates | 15, 16 |
| the forms' pins: `brand-`, `company-`, `department-`, `branch-`, `location-`, `employee-`, `supplier-`, `category-form-ui`, `master-data-sweep-ui`, `admin-user-form-ui`, `admin-sweep-ui`, `role-permission-form-ui`, `integration-api-client-admin`, `asset-state-review-ui`, `data-quality-rule-form-ui`, `report-presets`, `reports-dashboard-sweep-ui` | each in its form's task | 19–29 |
| `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`; `tests/v-track-docs.test.ts` (new); `tests/dark-mode-docs.test.ts` | the plan's section and entry; their record test; the Dark Mode entry's order pin | 31 |

No change (checked): `src/app/api/integrations/v1/**` and `src/lib/integration-auth.ts` (Task 2 pins them), `src/lib/asset-transaction-cancellation-route.ts` (it gets `fieldErrors` through `validationFailedBody`), `src/lib/prisma-unique-retry.ts`, `prisma/`, `DESIGN.md` and `docs/14_UI_UX_DESIGN_SYSTEM.md` (the final plan), `c/ui/choice-card.tsx` and `c/ui/segmented.tsx` (F-R8), every form of the later plans except the asset form's two duplicate fields (Task 15), `tests/form-migration-guards.test.ts` (F-R10), `tests/list-frame-guards.test.ts`, `tests/ui-overlay-guards.test.ts`.

## Interfaces between tasks

| Made in | What | Used by |
|---|---|---|
| Task 1 (S1) | `src/lib/field-errors.ts`: `FORM_ERROR_KEY`, `FieldErrorCode`, `FieldErrors`, `IssueLike` (+ `received?`), `fieldErrorKey`, `issueToFieldErrorCode`, `issuesToFieldErrors`; `tests/v-track-s.test.ts` with `read` and `issuesOf` | Tasks 2–10; Task 11 (the types), 14 (`FORM_ERROR_KEY`) |
| Task 2 (S2) | `FieldRefusalError`; `src/lib/field-error-response.ts`; the 400 `{ error, code: "VALIDATION_FAILED", fieldErrors }` from every route through `errorResponse` and the cancellation helper; `validationFailedBody(error, keyFor?)`; the test header's resolve hook, stand-ins and `load<T>(path)` | Tasks 3–10; every form's `applyServer` |
| Task 3 (S3) | `apiErrors.recipientRequired`; the catalog scan reads `message:` literals, `nonErrorMessageFiles` | the disposal plan |
| Task 4 (S4) | `settingFieldKeyFor(submitted)`; `settings.<settingKey>` keys; the test helpers `jsonRequest(method, body)` and `stubDb(prisma)` | Tasks 5–10; the settings plan |
| Task 5 (S5) | `assetBatchItemIssuePath(index, path)`, `buildAssetBatchDuplicateFieldErrors(rows, duplicates)`; `common.<field>`, `rows.<i>.<field>` keys | the assets plan |
| Task 6 (S6) | `disposalApiError(code, error, status = 400, fieldErrors?)`; checkout's `HANDOVER_*` body with `fieldErrors` | the operations and disposal plans |
| Task 7 (S7) | supplier on the shared body (400 `VALIDATION_FAILED`, 409 `DUPLICATE` on `code`); `parseSupplierFormError` on the shared codes; the test helper `uniqueViolation()` | Task 8; Task 22 (M4, A-R4) |
| Task 8 (S8) | 409 `{ error, code: "DUPLICATE", fieldErrors: { code \| name: "duplicate" } }` from company, department, employee, location, brand, model (create and update) and category; the seven catalog keys; the `field-error-response` import in the 12 routes | Task 9; Tasks 19–21, 23, 24 |
| Task 9 (S9) | `username`, `password`, `name` (role), `permissionIds`, `code` (branch), `managerId`, `parentId` keys | Tasks 20, 21, 25, 26 |
| Task 10 (S10) | `serialNumber`, `documentNo`, `conditionBefore`, `nextStatusId`, `vendorId`, `assignedToUserId`, `_form` (import) | the assets, operations and maintenance plans |
| Task 11 (F1) | `src/lib/validation-rules.ts` (eight helpers, `RuleCode`); `tests/v-track-f.test.ts` with `read` | Tasks 12–17; every M task |
| Task 12 (F2) | `common.validation.*` (17 keys); `src/lib/field-error-client.ts`: `ValidationParams`, `MessageLookup`, `validationMessageKey`, `resolveValidationMessage` | Task 14; every M task (through the hook) |
| Task 13 (F3) | `src/lib/field-focus.ts`: `FIELD_FOCUS_MARGIN`, `FieldScrollBox`, `fieldScrollTop`, `focusField`, `waitForElement` | Tasks 14, 17 |
| Task 14 (F4) | `useFieldErrors`, `useValidationMessage`, `FieldErrorMap`; `readFieldErrors`, `firstErrorKey`, `withoutKeys` | every M task (A-R2) |
| Task 15 (F5) | `FieldError` without a role; `Field liveError` | every M task; the later plans' live warnings (U8) |
| Task 16 (F6) | `triggerInvalidClasses`, `data-invalid`; `id`/`error` on `MaintenanceOptionSelect` and `AuditScanCheckField` | the later plans' required selects (V4, V5) |
| Task 17 (F7) | `FieldGroup({ legend, required, hint, error, id, className, children })`, error id `${id}-error` | Task 27 (M9, A-R3); the later plans (handover mode, repair outcome) |
| Task 18 (F8) | `V_SCOPE`, `NOT_IN_SCOPE`, `V_FORMS` (empty), `SELECT_STAR_ONLY`, V1–V5; `withoutBlockComments`, `catchRanges`, `linesOutsideCatch` | Tasks 19–29 (`V_FORMS` rows, A-R5); the later plans |
| Task 19 (M1) | `tests/v-track-m.test.ts` with `C`, `read`, `escape`, `validateBody`, `assertMigratedForm`; the form pattern (`FIELD_IDS`, `validate()`, `focusFirstError`, the refusal lines); the multi-line `V_FORMS` | Tasks 20–29; the later plans |
| Task 20 (M2) | the prerequisite gate pattern (`aria-disabled`, a visible reason); `branch.saveNeedsCompany`, `location.saveNeedsBranch` | the later plans' gates |
| Task 22 (M4) | no supplier-only error code, parser or message left; Task 7's test ends at its `existsSync` lines | Task 32 (the wiki's supplier note) |
| Task 23 (M5) | dotted row keys on the client (`customFieldDefs.<i>.<field>`, `photoChecklist.<i>`) | the assets plan (batch rows) |
| Task 28 (M10) | a dialog that gets its refusal back from its workspace (M-R9) | the operations plan (review dialogs) |
| Task 29a (S11) | 409 `DUPLICATE` under `name` (role update), `customFieldDefs.<i>.fieldName` (category create and update) and `clientId` (integration create); the branch `code` refusal for an inactive branch's code; `employeeId: "employeeHasUser"` (user create and update); `duplicateCustomFieldNameErrors`; `apiErrors.customFieldNameDuplicate`, `apiErrors.integrationClientIdExists` | the forms of Tasks 20, 23, 25, 26, 27 (their tables already hold the keys); Task 30 Steps 5–6 |
| Tasks 1–29a | the code and guard end state Task 31 describes | Task 31 |
| Task 30 | `.superpowers/sdd/v-track-plan1/task-30-findings.md` | Task 31 |
| Task 31 | the handoff section and the changelog entry, each with a dev-app check bullet | Task 32 (the verify bullets above them) |

---

### Task 0: Branch, baseline, counting evidence and before evidence (controller runs this task, not an implementer)

**Files:**
- Create then delete: a launch configuration for the dev server only while it runs; never committed. If `.claude/launch.json` already holds another session's configuration, add your own entry with its own name and port, and remove only that entry afterwards.
- Evidence (git-ignored): `.superpowers/sdd/screenshots/v-track-plan1/before/`, `.superpowers/sdd/v-track-plan1/task-0-baseline.md` and `.superpowers/sdd/v-track-plan1/task-0-counts/`.

**Interfaces:**
- Consumes: `feat/v-track` at the plan commit (on `71e5251`).
- Produces: the baseline numbers, the counting evidence, and the before images and behaviour of the plan-1 forms, which Task 30 compares against.

- [ ] **Step 1: Branch and base.**
  - `git rev-parse --abbrev-ref HEAD` → `feat/v-track`.
  - `git merge-base --is-ancestor 71e5251 HEAD && git diff --quiet 71e5251 HEAD -- src tests messages public scripts prisma && echo BASE-OK` → `BASE-OK`; `git diff --name-only 71e5251 HEAD` lists only this plan.
  - `git status --short` → only the untracked folders and files of the Global Constraints.
- [ ] **Step 2: Baseline.** `npm test` (expected 2226 tests, 2225 pass, 0 fail, 1 skipped), `npx tsc --noEmit` (clean), `npm run lint` (0 errors; 146 warnings, every one under `.agents/`). Record the numbers in `task-0-baseline.md`.
- [ ] **Step 3: Temp files.** Check `<tools>/eol.mjs` against the Global Constraints block; hand the paths of `<temp>` and `<tools>` to every implementer. The change files of Tasks 3, 7, 8, 12, 20 and 22 are written by those tasks.
- [ ] **Step 4: Counting evidence at `71e5251`** (read-only `git grep`, `node --test` of throwaway probes kept in `<temp>`, and `node <tools>/eol.mjs`; save the output under `task-0-counts/`; a difference stops the plan, because an inventory row would be wrong):
  - `validationFailedBody` callers: 2 (`api-response.ts`, `asset-transaction-cancellation-route.ts`); each of the 12 master-data route files has exactly one `    return errorResponse(error, 400)` and one `import { errorResponse } from "@/lib/api-response"` (Task 8); `getSupplierApiError` in the two supplier routes; `supplier-form-errors` imported by `supplier-form.tsx` and `supplier-api-error.ts` only (A-R4);
  - the only `message: "…"` literals with no catalog key: the recipient rule and the six of Task 3's inventory;
  - `src` `<form>` elements that are not `role="search"`: 39 in 36 files (two JSX comments name `<form>` and are not forms); 16 required selects with no `error=` in 12 files by the guard's reader (the 14 in 10 form files of `SELECT_STAR_ONLY`, plus the two wrappers' own `<SearchableSelect required={required}>` in `maintenance-option-select.tsx` and `audit-scan-check-field.tsx`, which Task 16 gives `error={error}`); 62 `toast.error`/`toast.warning` outside a catch in 20 files (F's inventory); 0 `SearchableSelect`, `MaintenanceOptionSelect` or `AuditScanCheckField` in the 15 plan-1 form files (A-R5);
  - FMG `STAR_ONLY` 3 entries (A-R11); `messages/th.json` 4067 leaf keys; `noValidate` in `src`: 1 (checkin).
- [ ] **Step 5: Dev server.**
  - If `preview_list` shows a dev server of this checkout on `:3000`, use it and do not stop it. Otherwise add a launch configuration `name: "asset-v1-dev-3100"`, `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "dev", "-p", "3100"]`, `port: 3100`, `autoPort: false` (if another session's server holds 3100, use 3102 and say so in the baseline file), and start it with `preview_start`.
  - Memory says `.env` points at `asset_management_dev` / `asset_dev`. Confirm this without opening the file: `/th/admin/readiness` shows the database checks. If anything suggests the production database, stop.
  - Log in with the seed admin of `prisma/seed.ts`; do not echo the password. Use your own browser tab.
- [ ] **Step 6: Write nothing.** Open forms and dialogs, close them with ยกเลิก, the X or Esc. Press a save only where the browser's own check stops it before any request (an empty required field, `required` on the control); never on the data-quality rules (no required field: it would save), the integration create or edit, the state review, or a filled form. Count POST, PUT, PATCH and DELETE requests while you work: expected 0.
- [ ] **Step 7: Before evidence** at 1440 and 375, light and dark (the toggle beside the language button), for every plan-1 form: brand, branch, category (with a custom field row and a photo row), company, department, employee, location, asset model, supplier (`/th/master-data/*/new` and one edit page each), the admin user create and edit, a role create and edit, the integration create and the edit dialog, the asset state review dialog (`/th/admin/asset-state-review`), the data-quality rules, and the report preset name (`/th/reports`):
  - a screenshot of the form as it opens to `before/<form>-<theme>-<width>.png`;
  - where Step 6 allows, the empty submit: a screenshot of the browser's bubble and which field it names, and that no error shows under any field;
  - the disabled gates as they are: the integration edit's save with every scope unchecked (and that the last scope cannot be unchecked), the state review's confirm with a 5-character reason, the branch and location save when the dataset has no company or branch (else note it);
  - the preset name's empty save (local only): the danger Notice under the row.
- [ ] **Step 8: Clean up.** Stop your server if you started one and remove your launch configuration (only yours; delete `.claude/launch.json` only if you created the file). `git status --short` shows what Step 1 showed. No commit in this task.

---

## Area S: the server names the fields that failed (Tasks 1–10, S1–S10)

Spec `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` §6 (all of it), U3 and U9, §8 "the server change is reviewed first and lands as the first commits of the round", §11 calls 3–5. Area S runs **first**; areas F and M build on its body, its codes and its keys. It touches no `.tsx` file except one function of `src/components/master-data/supplier-form.tsx` (S7), and no `messages` key outside `apiErrors`.

**Tests:** one new LF file, `tests/v-track-s.test.ts`, one test per task, appended in order (10 tests; Task 29a, S11, appends an eleventh after area M). S2 adds the route stand-ins to its header; later tasks add small helpers directly above their own test. Pins in other test files change in the task that changes what they pin (S2, S3, S7). `tests/supplier-api-error.test.ts` is deleted in S7 (its module goes; S7's test covers what it checked).

**Messages:** `apiErrors` only, through `node scripts/messages-edit.mjs <change file>`: S3 adds 1, S7 deletes 1, S8 adds 7 (4067 → 4068 → 4067 → 4074 leaf keys in each locale). Area F's `common.validation.*` keys come on top of 4074. S11 (Task 29a) adds 2 after area M (4090 → 4092).

**Next.js 16.4:** area S uses no new Next API. Route handlers keep answering with `NextResponse.json(body, { status })` as they do today (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-response.md`, `## json()`; `03-file-conventions/route.md`).

**How the routes are tested:** `node --test` cannot load `next/server` or `@/…`, so S2's test header registers a resolve hook (the same technique as `tests/admin-user-routes.test.ts`) that serves stand-ins for `next/server`, `@/lib/auth-utils`, `@/lib/audit-log` and `@/lib/db`, and maps every other `@/x` to `src/x.ts`. The `@/lib/db` stand-in is a Proxy: `prisma.<model>.<method>(…)` calls `globalThis.__vTrackS.prisma[model][method]`, and a call with no handler throws `no stand-in for prisma.<model>.<method>`, so each test names every query its route makes. Route modules are loaded with a dynamic `import()` after the hook is registered. One exception: `src/app/api/disposal-requests/[id]/route.ts` loads a service with a TypeScript parameter property, which node's strip-only mode refuses (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`), so S6 reads that route as source and runs its helper.

### Inventory (S at `71e5251`)

| Where | What is there | Task |
|---|---|---|
| `src/lib/api-error-exposure.ts:29-36` | `validationFailedBody(error)` returns `{ error: "Invalid request data", code: "VALIDATION_FAILED" } as const` for a `ZodError`, else `null`; the comment at `:31` says "The V track adds fieldErrors to this body." The file has no `@/` import (tests import it). | S2 |
| `src/lib/api-response.ts:1-19` | `errorResponse(error, fallbackStatus = 500)`: `validationFailedBody` first (`:5-6`), then `isExposableError` (`:7`), then `{ error: message }` with 401/403/`fallbackStatus` | S2 |
| `src/lib/asset-transaction-cancellation-route.ts:7-8` | the second caller of `validationFailedBody` (same 400 body) | S2 (no edit; gets `fieldErrors` through the body) |
| `src/lib/prisma-unique-retry.ts:16-18` | `isPrismaUniqueConstraintError(error)` (`code === "P2002"`); used by `withPrismaUniqueRetry` and `supplier-api-error.ts` | S2 (re-exported, not moved, S-R5) |
| `src/lib/api-error-catalog.ts:2-257` | `apiErrorKeyByMessage`, sorted by message; `getApiErrorKey(raw)` at `:263-265`; the file imports nothing | S1 (read), S3, S7, S8 |
| `src/lib/api-error-catalog.ts:202` | `"Purchase document already exists": "purchaseDocumentExists",` (the new recipient key goes after it) | S3 |
| `src/lib/api-error-catalog.ts:157` | `"Invalid supplier data": "invalidSupplierData",` (only `supplier-api-error.ts` sends it) | S7 |
| `src/lib/disposal-type-policy.ts:42` | `{ field: "recipientName", message: "Recipient, buyer, or destination is required" }`, raised as a zod `custom` issue by `validations/disposal.ts:57-61`; no catalog key | S3 |
| `tests/api-error-catalog.test.ts:60-70` | the literal scan `/(?:\berror:\s*|new\s+\w*Error\(\s*(?:\d+\s*,\s*)?)"([A-Za-z][^"]{2,160})"/g` over `src/app/api` and `src/lib`; `:81-83` checks `internalErrorFiles` exist | S3 |
| `src/app/api/audit-rounds/[id]/scan/route.ts:260`, `src/lib/disposal-bulk-execution-ui.ts:93`, `:96`, `src/lib/ldap-auth.ts:161`, `:164`, `:181` | the only `message: "…"` literals with no catalog key besides the recipient one: a 202 result, two selection codes, the LDAP test results | S3 (exempt, S-R11) |
| `src/app/api/admin/settings/route.ts:51`, `:117-119` | `systemSettingsUpdateSchema.parse(await request.json())`; `catch → errorResponse(error, 400)`. Every settings issue has path `["settings", index, "value"]` (`validations/system-settings.ts:62-261`); the form sends every setting in order | S4 |
| `src/app/api/assets/batch/route.ts:63-72` | `buildAssetBatchDuplicateMessage(…)` then `NextResponse.json({ error: duplicateMessage }, { status: 400 })` | S5 |
| `src/app/api/assets/batch/route.ts:89-100` | `.map((asset) => { const parsed = assetSchema.parse(asset) …` — the per-row parse; its issues (e.g. `["licenseUsedSeats"]` from `validations/asset.ts:52-66`) name no row | S5 |
| `src/lib/asset-batch-create.ts:46-48`, `:50-74`, `:171-205` | `normalizedKey` (trim + lower case), `findDuplicateBatchValues`, `buildAssetBatchDuplicateMessage`, `buildAssetBatchDuplicateCheckSummary` (the file's last function); type imports only | S5 |
| `src/app/api/assets/[id]/checkout/route.ts:225-228` | the `HANDOVER_*` branch: `{ code: issue.message, error: issue.message }`, 400 | S6 |
| `src/app/api/disposal-requests/[id]/route.ts:209-216` | `issue.path[0] === "evidenceExceptionReason"` → `disposalApiError("DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED", "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED")`; pinned by `tests/disposal-route-structure.test.ts:224-238` (stays green) | S6 |
| `src/lib/disposal-api-errors.ts:7-9` | `disposalApiError(code, error, status = 400)` → `{ code, error }` | S6 |
| `src/app/api/suppliers/route.ts:7`, `:69-73`; `src/app/api/suppliers/[id]/route.ts:9`, `:102-106` | `getSupplierApiError(error)` before `errorResponse` | S7 |
| `src/lib/supplier-api-error.ts` (44 lines) | the supplier body `{ error: "Invalid supplier data", fieldErrors }`, snake codes, 409 `duplicate_code` | S7 (deleted) |
| `src/lib/supplier-form-errors.ts:13-18`; `src/components/master-data/supplier-form.tsx:104-109` | `supplierFormErrorCodes = ["required", "invalid_email", "too_long", "duplicate_code"]`; `getErrorMessage(code)` maps them | S7 |
| `tests/supplier-api-error.test.ts` (4 tests); `tests/supplier-form-errors.test.ts:8-31` | pins of the supplier body and the snake codes | S7 |
| `src/app/api/{companies,departments,employees,locations,brands,models}/route.ts` POST and `…/[id]/route.ts` PUT | create/update with no duplicate check; P2002 → `isExposableError` false → 500 "Unexpected error · ref …". Each of the 12 files has exactly one `    return errorResponse(error, 400)` (the GET/DELETE catches have no `, 400`) and one `import { errorResponse } from "@/lib/api-response"`. Unique columns: `prisma/schema.prisma:18` (company code), `:64` (department code), `:83` (employee code), `:133` (location code), `:182` (brand name), `:207` (`@@unique([brandId, name])` model) | S8 |
| `src/app/api/categories/route.ts:52-62`; `src/app/api/categories/[id]/route.ts:61-65` | create checks only an **inactive** duplicate (reactivates it); update checks none. Category code unique `prisma/schema.prisma:163`; custom fields have their own `@@unique([categoryId, fieldName])` `:482` | S8 |
| `src/app/api/admin/users/route.ts:42`, `:98`; `src/app/api/admin/users/[id]/route.ts:103` | `"Password is required"` (400); `throw new Error("Username already exists")` in `assertUniqueUsername` (sent 400 by `errorResponse(error, 400)`) | S9 |
| `src/app/api/admin/roles/route.ts:17`, `:24`; `src/app/api/admin/roles/[id]/route.ts:36` | `"Role name already exists"` (409); `"Invalid permission selection"` (400) ×2 | S9 |
| `src/app/api/branches/route.ts:62-69`; `src/app/api/branches/[id]/route.ts:67-74` | the Thai duplicate-code literal, 400 | S9 |
| `src/app/api/employees/[id]/route.ts:55`; `src/app/api/locations/[id]/route.ts:58`, `:79` | own manager; own parent; cycle (400) | S9 |
| `src/app/api/assets/route.ts:142`; `src/app/api/assets/[id]/route.ts:167` | `throw new Error("Serial Number already exists")` in `assertUniqueSerial` (sent 400) | S10 |
| `src/app/api/purchase-documents/route.ts:64` | `{ error: "Purchase document already exists", id: existing.id }`, 409 | S10 |
| `src/app/api/assets/[id]/checkout/route.ts:59-61` | `{ code: conditionError, error: "Invalid asset condition for checkout" }`, 400 | S10 |
| `src/app/api/assets/[id]/status-correction/route.ts:33` | `{ error: statusError }`, 400 (`statusError` is one of two catalog messages) | S10 |
| `src/app/api/maintenance-plans/route.ts:54`; `src/app/api/notifications/route.ts:44` | PM vendor; assignee (400) | S10 |
| `src/app/api/assets/import-preview/route.ts:17-25`; `src/app/api/assets/import-confirm/route.ts:27-35` | three Thai file rules (no file, over 10 MB, not `.xlsx`), 400 | S10 |
| `src/app/api/integrations/v1/**` (9 route files), `src/lib/integration-auth.ts:111-122` | `integrationErrorResponse` → `{ error: { code, message, requestId } }`; no `errorResponse` | S2 (pinned unchanged) |

### Interfaces this area makes (for F and M, and for the later plans)

| Made in | What | Used by |
|---|---|---|
| S1 | `src/lib/field-errors.ts`: `FORM_ERROR_KEY`, `FieldErrorCode`, `FieldErrors`, `IssueLike` (+ `received?`), `fieldErrorKey`, `issueToFieldErrorCode`, `issuesToFieldErrors` (FIXED 1) | F (hook, rule helpers return `FieldErrorCode`), M |
| S2 | `FieldRefusalError` (S-R6) in `field-errors.ts`; `src/lib/field-error-response.ts`: `fieldErrorResponse`, `uniqueConflictResponse`, re-exported `isPrismaUniqueConstraintError` (FIXED 2) | S5–S10, later server work |
| S2 | the 400: `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors }` from every route through `errorResponse` and the cancellation helper; `validationFailedBody(error, keyFor?)` | F's `applyServer`, every form |
| S2 | `tests/v-track-s.test.ts` header: `read`, `issuesOf`, the resolve hook with the four stand-ins, `load<T>(path)`; S4 adds `jsonRequest(method, body)` and `stubDb(prisma)`; S7 adds `uniqueViolation()` | S3–S10 |
| S3 | catalog key `recipientRequired` (`apiErrors.recipientRequired`) | disposal plan |
| S4 | `settingFieldKeyFor(submitted)`; settings keys `settings.<settingKey>` | settings plan |
| S5 | `assetBatchItemIssuePath(index, path)`, `buildAssetBatchDuplicateFieldErrors(rows, duplicates)` in `src/lib/asset-batch-create.ts`; batch keys `common.<field>`, `rows.<i>.<field>` | assets plan |
| S6 | `disposalApiError(code, error, status = 400, fieldErrors?)` | disposal plan |
| S7 | supplier codes `required` / `invalidEmail` / `tooLong` / `duplicate`; **Task 22 (M4), when it replaces `parseSupplierFormError` with `applyServer`, deletes the last block of S7's test** (from the comment `// The supplier-only body and its snake codes are gone` to the end of the test, keeping the `existsSync("src/lib/supplier-api-error.ts")` line) and deletes `src/lib/supplier-form-errors.ts` with `tests/supplier-form-errors.test.ts` (A-R4) | M (supplier) |
| S8 | 409 `{ error, code: "DUPLICATE", fieldErrors: { code \| name: "duplicate" } }` from company, department, employee, location, brand, model (create and update) and category; catalog keys `companyCodeExists`, `departmentCodeExists`, `employeeCodeExists`, `locationCodeExists`, `brandNameExists`, `modelNameExists`, `categoryCodeExists` | M (master-data forms) |
| S9 | `username`, `password`, `name` (role), `permissionIds`, `code` (branch), `managerId`, `parentId` keys with the codes of S-R7 | M (admin, master data) |
| S10 | `serialNumber`, `documentNo` (purchase document; the asset form's state is `purchaseDocumentNo`), `conditionBefore`, `nextStatusId`, `vendorId`, `assignedToUserId`, `_form` (import) | assets, operations, maintenance plans |
| S11 (Task 29a) | role `name` on update (409 `DUPLICATE`), branch `code` for an inactive branch's code, `customFieldDefs.<i>.fieldName` (409 `DUPLICATE`), integration `clientId` (409 `DUPLICATE`), user `employeeId` (`employeeHasUser`); `duplicateCustomFieldNameErrors` in `src/lib/category-custom-field-names.ts` (S-R13) | M (the forms already hold the keys) |

Keys M's forms receive (all top-level, the form state's own names, recon-1 §3): supplier `code` `name` `contactPerson` `phone` `email` `address`; company `code` `assetTagCode` `nameTh` `nameEn` `taxId` `address`; department `code` `name` `companyId`; employee `code` `fullNameTh` `fullNameEn` `email` `companyId` `branchId` `departmentId` `position` `employmentStatus` `managerId`; location `code` `name` `branchId` `parentId` `locationType` `description`; branch `code` `name` `companyId` `address` `contactPerson`; brand `name`; model `name` `categoryId` `brandId` `specs`; category `code` `name` `description` and nested `customFieldDefs.<i>.<field>`, `photoChecklist.<i>…`; user `username` `password` `displayName` `email` `employeeId` `roleIds`; role `name` `displayName` `displayNameTh` `description` `permissionIds`; integration client `displayName` `scopes`; state review resolve has no field path for its refine (`_form`, code `stateTargetRequired`).

### Review notes (area S)

1. `errorResponse` order: zod first, then `FieldRefusalError`, then `isExposableError`; a P2002 that no route catches still ends hidden (S2's test checks the 500 and the reference).
2. Integration v1 does not change: no file under `src/app/api/integrations/v1` mentions `errorResponse(`, `fieldErrors`, `field-error`, `api-response` or `validationFailedBody`, and `integration-auth.ts` keeps its body (S2's test).
3. No `fieldErrors` value is ever raw zod text or a snake code: S1's map covers every issue code zod 4.4.1 defines (`node_modules/zod/v4/core/errors.d.ts:13-115`), the rest fall to `invalid`.
4. A P2002 is answered as a duplicate of the right column: only routes with one unique column catch P2002 (S8); category checks before writing.
5. The settings route never loses an issue: an issue without a usable submitted key keeps its dotted path.
6. No server rule is added (spec §6.3): every refusal in S9/S10 existed; only its body gained `fieldErrors`. The checkout `HANDOVER_*` and disposal branches keep their `code`.

---

### Task 1 (S1): Field errors, one code per dotted field key from zod issues (`src/lib/field-errors.ts`)

Spec §6.1 "Keys" and "Codes"; FIXED INTERFACE 1; S-R1, S-R2, S-R3.

**Files:**
- Create: `src/lib/field-errors.ts` (LF, new)
- Create: `tests/v-track-s.test.ts` (LF, new; S2–S10 append to it)

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| new file `src/lib/field-errors.ts` | — | a header comment (what the module is for; that tests and client code import it, so no `@/` import and zod only through the structural `IssueLike`), `import { getApiErrorKey } from "./api-error-catalog.ts"`, then the exports below | S-R1 |

The exports (Step 1's test fixes their behavior):
- `export const FORM_ERROR_KEY = "_form"`.
- `export type FieldErrorCode = "required" | "tooShort" | "tooLong" | "outOfRange" | "invalidDate" | "invalidNumber" | "invalidEmail" | "invalidFormat" | "invalidChoice" | "duplicate" | "invalid"` (FIXED 1).
- `export type FieldErrors = Record<string, string>` with a comment: key = dotted path or `"_form"`, value = a `FieldErrorCode` or an api-error catalog key.
- `export type IssueLike = { code: string; path: readonly PropertyKey[]; message: string; minimum?: unknown; maximum?: unknown; origin?: string; format?: string; expected?: string; received?: unknown; input?: unknown }` (S-R1).
- `export function fieldErrorKey(path: readonly PropertyKey[]): string`: `path.length === 0 ? FORM_ERROR_KEY : path.map((segment) => String(segment)).join(".")`.
- `export function issueToFieldErrorCode(issue: IssueLike): string`: `getApiErrorKey(issue.message)` first, then a `switch (issue.code)` that is exactly the table of S-R2.
- `export function issuesToFieldErrors(issues: readonly IssueLike[], keyFor?: (path: readonly PropertyKey[]) => string | null): FieldErrors`: for each issue, `key = keyFor?.(issue.path) ?? fieldErrorKey(issue.path)`; set it only if the key is not yet in the result (first issue wins).

zod's own `$ZodIssue[]` (`error.issues`) passes as `readonly IssueLike[]` without a cast (checked by `tsc` in the rehearsal).

- [ ] **Step 1: The failing test.** Create `tests/v-track-s.test.ts` (LF) with a file tool, not a shell heredoc (a heredoc collapses `\\`), with exactly:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { z } from "zod"
import { FORM_ERROR_KEY, fieldErrorKey, issueToFieldErrorCode, issuesToFieldErrors } from "../src/lib/field-errors.ts"

// V track plan 1, area S (spec docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §6): the server names the
// fields that failed. One test per commit. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const issuesOf = (schema: z.ZodType, input: unknown) => {
  const parsed = schema.safeParse(input)
  assert.equal(parsed.success, false)
  return parsed.error!.issues
}

test("zod issues become one camelCase code per dotted field key, the first issue winning (V spec §6.1)", () => {
  assert.equal(FORM_ERROR_KEY, "_form")
  assert.equal(fieldErrorKey([]), "_form")
  assert.equal(fieldErrorKey(["name"]), "name")
  assert.equal(fieldErrorKey(["rows", 3, "serialNumber"]), "rows.3.serialNumber")
  assert.equal(fieldErrorKey(["customFieldDefs", 0, "fieldName"]), "customFieldDefs.0.fieldName")

  const optionalDate = z.preprocess((value) => (typeof value === "string" && value.trim().length === 0 ? null : value), z.coerce.date().nullable().optional())
  const schema = z.object({
    name: z.string().trim().min(1).max(5),
    code: z.string().trim().min(3),
    note: z.string().max(4),
    email: z.string().email(),
    slug: z.string().regex(/^[a-z]+$/),
    site: z.url(),
    day: z.coerce.date(),
    maybeDay: optionalDate,
    qty: z.coerce.number().int().min(1).max(10),
    price: z.coerce.number().multipleOf(0.01),
    kind: z.enum(["a", "b"]),
    tags: z.array(z.string()).min(1),
    active: z.boolean(),
  })
  assert.deepEqual(issuesToFieldErrors(issuesOf(schema, {
    name: "   ", code: "ab", note: "too long", email: "x", slug: "A1", site: "nope", day: "", qty: "abc", price: 1.005, kind: "z", tags: [], active: true,
  })), {
    name: "required", code: "tooShort", note: "tooLong", email: "invalidEmail", slug: "invalidFormat", site: "invalidFormat", day: "invalidDate",
    maybeDay: "required", qty: "invalidNumber", price: "invalidNumber", kind: "invalidChoice", tags: "required",
  })
  assert.deepEqual(issuesToFieldErrors(issuesOf(schema, { name: "abcdefgh", qty: 0 })), {
    name: "tooLong", code: "required", note: "required", email: "required", slug: "required", site: "required", day: "invalidDate",
    maybeDay: "required", qty: "outOfRange", price: "invalidNumber", kind: "invalidChoice", tags: "required", active: "required",
  })
  assert.deepEqual(issuesToFieldErrors(issuesOf(z.object({ qty: z.number().max(5) }), { qty: 9 })), { qty: "outOfRange" })

  // A message the api-error catalog knows becomes its key (custom issues, and custom messages on built-in checks); another
  // custom issue is "invalid"; an issue with no path (a whole-object refine, .strict()) goes under _form.
  const refined = z.object({ start: z.string(), end: z.string(), mode: z.enum(["x"], { error: "HANDOVER_MODE_REQUIRED" }) }).strict().superRefine((input, context) => {
    if (input.end < input.start) context.addIssue({ code: "custom", path: ["end"], message: "End date must be after start date" })
    context.addIssue({ code: "custom", path: ["start"], message: "Something no catalog knows" })
    context.addIssue({ code: "custom", path: [], message: "A status or condition target is required" })
  })
  assert.deepEqual(issuesToFieldErrors(issuesOf(refined, { start: "b", end: "a", mode: "x" })), { end: "endBeforeStart", start: "invalid", _form: "stateTargetRequired" })
  assert.deepEqual(issuesToFieldErrors(issuesOf(refined, { start: "a", end: "b", mode: "y", extra: 1 })), { mode: "handoverModeRequired", _form: "invalid" })
  assert.equal(issueToFieldErrorCode({ code: "too_small", origin: "array", minimum: 2, path: ["rows"], message: "Batch create requires at least 2 rows" }), "batchCreateMinRows")
  assert.equal(issueToFieldErrorCode({ code: "invalid_union", path: ["mode"], message: "Invalid discriminator value. Expected 'x' | 'y'" }), "invalidChoice")
  assert.equal(issueToFieldErrorCode({ code: "unrecognized_keys", path: [], message: "Unrecognized key: \"b\"" }), "invalid")

  // The first issue of a field wins; a keyFor callback can rename a key, and null keeps the dotted path.
  const twice = z.object({ name: z.string().min(3).regex(/^\d+$/) })
  assert.deepEqual(issuesToFieldErrors(issuesOf(twice, { name: "a" })), { name: "tooShort" })
  const rows = z.object({ rows: z.array(z.object({ serial: z.string().min(1) })) })
  assert.deepEqual(issuesToFieldErrors(issuesOf(rows, { rows: [{ serial: "x" }, { serial: "" }] })), { "rows.1.serial": "required" })
  assert.deepEqual(issuesToFieldErrors(issuesOf(rows, { rows: [{ serial: "" }] }), (path) => (path[0] === "rows" ? `line.${String(path[1])}` : null)), { "line.0": "required" })
  assert.deepEqual(issuesToFieldErrors(issuesOf(rows, { rows: [{ serial: "" }] }), () => null), { "rows.0.serial": "required" })

  // Plain module: tests and client code import it, so no "@/" import and no zod at run time.
  const source = read("src/lib/field-errors.ts")
  assert.doesNotMatch(source, /from "@\/|"use client"|^import \{[^}]*\} from "zod"|^import \* as \w+ from "zod"/m)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-s.test.ts`. Expected to fail: the file itself, `ERR_MODULE_NOT_FOUND` for `src/lib/field-errors.ts` (no test runs).
- [ ] **Step 3: Implement** `src/lib/field-errors.ts` as above.
- [ ] **Step 4: Pin edits:** none.
- [ ] **Step 5: Verify.** `node --test tests/v-track-s.test.ts tests/api-error-catalog.test.ts`; `npm test` (2227 tests, 2226 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit` (clean); `npx eslint src/lib/field-errors.ts tests/v-track-s.test.ts` (clean). Both new files are LF (90 and 75 lines in the rehearsal).
- [ ] **Step 6: Commit.** `git add src/lib/field-errors.ts tests/v-track-s.test.ts` (git warns that LF will become CRLF in the working copy: expected), then `git commit -m "feat(api): field errors, one code per dotted field key from zod issues (v-track plan 1 task 1, S1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 2 (S2): The 400 for invalid input carries fieldErrors, and field refusals share the body (`src/lib/api-error-exposure.ts`, `src/lib/api-response.ts`, `src/lib/field-error-response.ts`)

Spec §6.1 "The body", §6.2 (the shape), §3 (Integration v1 unchanged); FIXED INTERFACE 2; S-R3, S-R5, S-R6, S-R9.

**Files:**
- Modify: `src/lib/field-errors.ts` (LF; append `FieldRefusalError`)
- Create: `src/lib/field-error-response.ts` (LF, new)
- Modify: `src/lib/api-error-exposure.ts`, `src/lib/api-response.ts` (CRLF working tree)
- Modify: `tests/api-error-exposure.test.ts` (CRLF; pin)
- Test: `tests/v-track-s.test.ts` (LF)

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| end of `src/lib/field-errors.ts` | — | `export class FieldRefusalError extends Error` with `readonly fieldErrors: FieldErrors` and `readonly status: number` declared in the body; `constructor(message: string, fieldErrors: FieldErrors, status = 400)` calls `super(message)`, sets `this.name = "FieldRefusalError"`, `this.fieldErrors`, `this.status`; a comment says it is a refusal about fields the code throws on purpose, answered by `errorResponse`. No parameter properties. | S-R6 |
| new file `src/lib/field-error-response.ts` | — | header comment (the `{ error, code?, fieldErrors }` body; duplicates 409 `DUPLICATE`); `import { NextResponse } from "next/server"`; `import type { FieldErrors } from "./field-errors.ts"`; `export { isPrismaUniqueConstraintError } from "./prisma-unique-retry.ts"`; `export function fieldErrorResponse(input: { status: number; error: string; fieldErrors: FieldErrors; code?: string })` → `NextResponse.json(code ? { error, code, fieldErrors } : { error, fieldErrors }, { status })`; `export function uniqueConflictResponse(field: string, error: string)` → `fieldErrorResponse({ status: 409, error, code: "DUPLICATE", fieldErrors: { [field]: "duplicate" } })` | FIXED 2, S-R5 |
| `src/lib/api-error-exposure.ts:4` | `import { ZodError } from "zod"` | the line `import { issuesToFieldErrors } from "./field-errors.ts"` added below it | S-R1 |
| `src/lib/api-error-exposure.ts:31-35` | ` * message instead, with a code that forms can match (spec 2C §8.5). The V track adds fieldErrors to this body.` / ` */` / `export function validationFailedBody(error: unknown) {` / `  if (!(error instanceof ZodError)) return null` / `  return { error: "Invalid request data", code: "VALIDATION_FAILED" } as const` | ` * message instead, with a code that forms can match (spec 2C §8.5), and fieldErrors: the code of each failing field's` / ` * first issue under its dotted path (V track spec §6.1). \`keyFor\` renames keys (the settings route keys by setting).` / ` */` / `export function validationFailedBody(error: unknown, keyFor?: (path: readonly PropertyKey[]) => string \| null) {` / `  if (!(error instanceof ZodError)) return null` / `  return { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: issuesToFieldErrors(error.issues, keyFor) } as const` | FIXED 2, S-R3 |
| `src/lib/api-response.ts:2` | `import { hideUnexpectedError, isExposableError, validationFailedBody } from "@/lib/api-error-exposure"` | it, then `import { fieldErrorResponse } from "@/lib/field-error-response"` and `import { FieldRefusalError } from "@/lib/field-errors"` | S-R6 |
| `src/lib/api-response.ts:6-7` | `  if (validation) return NextResponse.json(validation, { status: 400 })` / `  if (!isExposableError(error)) {` | between them: `  if (error instanceof FieldRefusalError) {` / `    return fieldErrorResponse({ status: error.status, error: error.message, fieldErrors: error.fieldErrors })` / `  }` | S-R6 |

`src/lib/asset-transaction-cancellation-route.ts` is not edited: it builds its 400 from `validationFailedBody(error)` and so carries `fieldErrors` too.

- [ ] **Step 1: The failing test.** In `tests/v-track-s.test.ts`:
  - replace the import block (old, exact):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { z } from "zod"
import { FORM_ERROR_KEY, fieldErrorKey, issueToFieldErrorCode, issuesToFieldErrors } from "../src/lib/field-errors.ts"
```

  with (new, exact):

```ts
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"
import { z } from "zod"
import { FORM_ERROR_KEY, FieldRefusalError, fieldErrorKey, issueToFieldErrorCode, issuesToFieldErrors } from "../src/lib/field-errors.ts"
import { findMatches, readSourceFiles } from "./helpers/source-files.ts"
```

  - insert directly after the `issuesOf` helper (after its closing `}` line, before the S1 test), with a blank line before it:

```ts
// Route modules import next/server and "@/…", which node --test cannot load, so a resolve hook serves stand-ins (as in
// tests/admin-user-routes.test.ts). The prisma stand-in calls globalThis.__vTrackS.prisma[model][method]; a call with no
// handler throws, so a test names every query its route makes.
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
      const handler = globalThis.__vTrackS?.prisma?.[model]?.[method]
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
```

  - append:

```ts

test("the 400 for invalid input names its fields, and field refusals and duplicates answer with the same body; Integration v1 keeps its own (V spec §6.1, §6.2)", async (t) => {
  type ApiResponse = typeof import("../src/lib/api-response.ts")
  type Cancellation = typeof import("../src/lib/asset-transaction-cancellation-route.ts")
  type FieldErrorResponse = typeof import("../src/lib/field-error-response.ts")
  type Exposure = typeof import("../src/lib/api-error-exposure.ts")
  const { errorResponse } = await load<ApiResponse>("src/lib/api-response.ts")
  const { assetTransactionCancellationErrorResponse } = await load<Cancellation>("src/lib/asset-transaction-cancellation-route.ts")
  const { fieldErrorResponse, isPrismaUniqueConstraintError, uniqueConflictResponse } = await load<FieldErrorResponse>("src/lib/field-error-response.ts")
  const { validationFailedBody } = await load<Exposure>("src/lib/api-error-exposure.ts")

  const parsed = z.object({ name: z.string().trim().min(1), rows: z.array(z.object({ serialNumber: z.string().max(3) })) }).safeParse({ name: "", rows: [{ serialNumber: "ok" }, { serialNumber: "toolong" }] })
  assert.equal(parsed.success, false)
  const body = { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { name: "required", "rows.1.serialNumber": "tooLong" } }
  assert.deepEqual(validationFailedBody(parsed.error), body)
  assert.deepEqual(validationFailedBody(parsed.error, (path) => (path[0] === "rows" ? `rows.${String(path[1])}` : null)), { ...body, fieldErrors: { name: "required", "rows.1": "tooLong" } })
  for (const response of [errorResponse(parsed.error, 500), assetTransactionCancellationErrorResponse(parsed.error)]) {
    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), body)
  }

  // A field refusal the code throws keeps its status and message and names its field.
  const refusal = errorResponse(new FieldRefusalError("Username already exists", { username: "duplicate" }), 400)
  assert.equal(refusal.status, 400)
  assert.deepEqual(await refusal.json(), { error: "Username already exists", fieldErrors: { username: "duplicate" } })
  const conflict = errorResponse(new FieldRefusalError("Role name already exists", { name: "duplicate" }, 409))
  assert.equal(conflict.status, 409)
  assert.equal(new FieldRefusalError("x", {}).name, "FieldRefusalError")

  const explicit = fieldErrorResponse({ status: 400, error: "Invalid assignee", fieldErrors: { assignedToUserId: "invalidAssignee" } })
  assert.equal(explicit.status, 400)
  assert.deepEqual(await explicit.json(), { error: "Invalid assignee", fieldErrors: { assignedToUserId: "invalidAssignee" } })
  const coded = fieldErrorResponse({ status: 400, error: "X", code: "SOME_CODE", fieldErrors: { a: "required" } })
  assert.deepEqual(await coded.json(), { error: "X", code: "SOME_CODE", fieldErrors: { a: "required" } })
  const duplicate = uniqueConflictResponse("code", "Supplier code already exists")
  assert.equal(duplicate.status, 409)
  assert.deepEqual(await duplicate.json(), { error: "Supplier code already exists", code: "DUPLICATE", fieldErrors: { code: "duplicate" } })
  assert.equal(isPrismaUniqueConstraintError({ code: "P2002" }), true)
  assert.equal(isPrismaUniqueConstraintError(new Error("P2002")), false)

  // Unexpected errors stay hidden behind a reference.
  t.mock.method(console, "error", () => {})
  const hidden = errorResponse(Object.assign(new Error("Unique constraint failed"), { name: "PrismaClientKnownRequestError", code: "P2002" }), 400)
  assert.equal(hidden.status, 500)
  assert.match((await hidden.json() as { error: string }).error, /^Unexpected error · ref [0-9a-f]{8}$/)

  // Integration v1 does not change (spec §3): its routes answer through integrationErrorResponse only.
  const v1 = readSourceFiles("src/app/api/integrations/v1")
  assert.ok(v1.length >= 9)
  assert.deepEqual(findMatches(v1, /\berrorResponse\(|fieldErrors|field-error|api-response|validationFailedBody/g), [])
  assert.doesNotMatch(read("src/lib/integration-auth.ts"), /fieldErrors|field-error|validationFailedBody/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-s.test.ts`. Expected to fail: the file itself, `SyntaxError: The requested module '../src/lib/field-errors.ts' does not provide an export named 'FieldRefusalError'` (no test runs).
- [ ] **Step 3: Implement** per the Changes table (exact string replacement; keep each file's line endings).
- [ ] **Step 4: Pin edit** (the old string occurs once): `tests/api-error-exposure.test.ts:75` (test "a ZodError reaches the browser as one fixed message, never the JSON of its issues (spec 2C §8.5)"): old `  assert.deepEqual(body, { error: "Invalid request data", code: "VALIDATION_FAILED" })` → new `  assert.deepEqual(body, { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { name: "required" } })`. Its `doesNotMatch(… /too_small|"path"|"origin"/)` on the next line stays and passes. Without the edit that test fails; every other test of the file stays green unchanged (the order pin `validationFailedBody(error)` before `if (!isExposableError(error))` holds).
- [ ] **Step 5: Verify.** `node --test tests/v-track-s.test.ts tests/api-error-exposure.test.ts tests/asset-transaction-cancellation-routes.test.ts`; `npm test` (2228 tests, 2227 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npx eslint src/lib tests/v-track-s.test.ts tests/api-error-exposure.test.ts`. `src/lib/field-errors.ts` is 106 LF lines, `src/lib/field-error-response.ts` 16.
- [ ] **Step 6: Commit.** `git add src/lib/field-errors.ts src/lib/field-error-response.ts src/lib/api-error-exposure.ts src/lib/api-response.ts tests/api-error-exposure.test.ts tests/v-track-s.test.ts`, then `git commit -m "feat(api): the 400 for invalid input carries fieldErrors, and field refusals share the body (v-track plan 1 task 2, S2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 3 (S3): The disposal recipient rule gets its catalog key, and the catalog test reads `message:` literals (`src/lib/api-error-catalog.ts`, messages, `tests/api-error-catalog.test.ts`)

Spec §6.3 (the only server-side change of a rule's text); S-R11.

**Files:**
- Modify: `src/lib/api-error-catalog.ts` (CRLF)
- Modify: `messages/th.json`, `messages/en.json` (through `scripts/messages-edit.mjs` only)
- Modify: `tests/api-error-catalog.test.ts` (CRLF)
- Test: `tests/v-track-s.test.ts` (LF)

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `src/lib/api-error-catalog.ts:202` | `  "Purchase document already exists": "purchaseDocumentExists",` | it, then `  "Recipient, buyer, or destination is required": "recipientRequired",` | spec §6.3 |
| messages | — | change file `{"set":{"th":{"apiErrors.recipientRequired":"กรุณาระบุผู้รับ ผู้ซื้อ หรือปลายทาง"},"en":{"apiErrors.recipientRequired":"Recipient, buyer, or destination is required"}}}` (the wording follows `disposalPage.recipientName` "ผู้รับ/ผู้ซื้อ/ปลายทาง") | glossary |
| `tests/api-error-catalog.test.ts:60-61` | `test("every literal error message the server can send has a Thai translation", () => {` / `  const pattern = /(?:\berror:\s*\|new\s+\w*Error\(\s*(?:\d+\s*,\s*)?)"([A-Za-z][^"]{2,160})"/g` | above the test, a new block: `// Files whose \`message:\` literals are not error text a route sends to a form (V track spec §6.3 widened the scan to` / ``// `message:`, where the zod issue messages of src/lib/validations and src/lib/disposal-type-policy.ts live). Each entry needs a reason.`` / `const nonErrorMessageFiles: Record<string, string> = {` / `  "src/app/api/audit-rounds/[id]/scan/route.ts": "the 202 out-of-scope scan result; the scan screen shows its own text",` / `  "src/lib/disposal-bulk-execution-ui.ts": "selection codes (mixed, limit) that the bulk execution screen turns into its own text",` / `  "src/lib/ldap-auth.ts": "the LDAP connection test result, which the settings screen shows as sent",` / `}` and a blank line; then the test line as it is, and the pattern becomes `/(?:\berror:\s*\|\bmessage:\s*\|new\s+\w*Error\(\s*(?:\d+\s*,\s*)?)"([A-Za-z][^"]{2,160})"/g` | S-R11 |
| `tests/api-error-catalog.test.ts:65-66` | `    for (const match of readFileSync(file, "utf8").matchAll(pattern)) {` / `      if (!(match[1] in apiErrorKeyByMessage)) missing.add(…)` | between them: `      if (match[0].startsWith("message") && file in nonErrorMessageFiles) continue` | S-R11 |
| `tests/api-error-catalog.test.ts:82` | `  for (const file of Object.keys(internalErrorFiles)) assert.ok(readFileSync(file, "utf8").length > 0, file)` | `  for (const file of [...Object.keys(internalErrorFiles), ...Object.keys(nonErrorMessageFiles)]) assert.ok(readFileSync(file, "utf8").length > 0, file)` | S-R11 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-s.test.ts`:

```ts

test("the disposal recipient rule has its catalog key, and the catalog test reads message: literals too (V spec §6.3)", async () => {
  const { getApiErrorKey } = await load<typeof import("../src/lib/api-error-catalog.ts")>("src/lib/api-error-catalog.ts")
  const { disposalExecutionSchema } = await load<typeof import("../src/lib/validations/disposal.ts")>("src/lib/validations/disposal.ts")
  assert.equal(getApiErrorKey("Recipient, buyer, or destination is required"), "recipientRequired")
  const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors.recipientRequired
  assert.equal(messages("th"), "กรุณาระบุผู้รับ ผู้ซื้อ หรือปลายทาง")
  assert.equal(messages("en"), "Recipient, buyer, or destination is required")
  // Every field rule of a disposal execution reaches its field as a catalog key (the form sends every key, empty or not).
  const issues = issuesOf(disposalExecutionSchema, {
    disposalType: "sell", executionDate: "2026-10-17", executedById: "e1", nextStatusId: "s1", recipientName: "", documentNo: "",
    evidenceExceptionReason: "", actualSaleValue: "", actualSalvageValue: "", executionRemark: "",
  })
  assert.deepEqual(issuesToFieldErrors(issues), { recipientName: "recipientRequired", documentNo: "referenceDocumentRequired", actualSaleValue: "saleValueRequired" })
  assert.ok(read("tests/api-error-catalog.test.ts").includes(String.raw`/(?:\berror:\s*|\bmessage:\s*|new\s+\w*Error\(`), "the catalog test reads message: literals")
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-s.test.ts`. Expected to fail: "the disposal recipient rule has its catalog key, and the catalog test reads message: literals too (V spec §6.3)" (`getApiErrorKey` returns `null`).
- [ ] **Step 3: Implement** per the Changes table: write the change file in the scratchpad (not in the repo) and run `node scripts/messages-edit.mjs <change file>` (prints `messages updated: 1 th, 1 en, 0 deleted`).
- [ ] **Step 4: Pin edits:** the catalog test rows of the Changes table are this task's pin edits. With the pattern widened and no exemption, the catalog test fails on the six `message:` literals of the inventory; with the exemptions it passes.
- [ ] **Step 5: Verify.** `node --test tests/v-track-s.test.ts tests/api-error-catalog.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts`; `npm test` (2229 tests, 2228 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npx eslint tests/v-track-s.test.ts tests/api-error-catalog.test.ts src/lib/api-error-catalog.ts`. Messages: 4068 leaf keys in each locale.
- [ ] **Step 6: Commit.** `git add src/lib/api-error-catalog.ts messages/th.json messages/en.json tests/api-error-catalog.test.ts tests/v-track-s.test.ts`, then `git commit -m "feat(api): the disposal recipient rule gets its catalog key, and the catalog test reads message: literals (v-track plan 1 task 3, S3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 4 (S4): The settings route keys field errors by setting (`src/app/api/admin/settings/route.ts`, `src/lib/field-errors.ts`)

Spec §6.1 "Keys" (`settings.<index>.value` → `settings.<settingKey>`); S-R4.

**Files:**
- Modify: `src/lib/field-errors.ts` (LF; append `settingFieldKeyFor`)
- Modify: `src/app/api/admin/settings/route.ts` (CRLF)
- Test: `tests/v-track-s.test.ts` (LF)

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| end of `src/lib/field-errors.ts` | — | `export function settingFieldKeyFor(submitted: unknown): (path: readonly PropertyKey[]) => string \| null` with a comment (the form sends every setting in one list; an issue at `settings.<index>.…` is keyed by the submitted setting's key; no usable key keeps the dotted path). It reads `submitted.settings` only when it is an array (else `[]`); the callback returns `null` unless `path[0] === "settings"` and `typeof path[1] === "number"`; then `settings[path[1]].key` when it is a non-empty string after `trim()` gives `` `settings.${key.trim()}` ``, else `null` | S-R4 |
| `src/app/api/admin/settings/route.ts:4` | `import { errorResponse } from "@/lib/api-response"` | it, then `import { validationFailedBody } from "@/lib/api-error-exposure"` and `import { settingFieldKeyFor } from "@/lib/field-errors"` | S-R4 |
| `:46-51` | `export async function PUT(request: NextRequest) {` / `  try {` / … / `    const input = systemSettingsUpdateSchema.parse(await request.json())` | `export async function PUT(request: NextRequest) {` / `  let submitted: unknown = null` / `  try {` / … (the auth lines as they are) / `    submitted = await request.json()` / `    const input = systemSettingsUpdateSchema.parse(submitted)` | S-R4 |
| `:117-118` | `  } catch (error) {` / `    return errorResponse(error, 400)` (the PUT's catch, after `return NextResponse.json({ updated: changedSettings.length })`) | `  } catch (error) {` / `    // Each setting's error goes under settings.<key>, the field the form shows it under (V track spec §6.1).` / `    const validation = validationFailedBody(error, settingFieldKeyFor(submitted))` / `    if (validation) return NextResponse.json(validation, { status: 400 })` / `    return errorResponse(error, 400)` | S-R4 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-s.test.ts`:

```ts

const jsonRequest = (method: string, body: unknown) =>
  new Request("http://localhost/api/test", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
const stubDb = (prisma: Record<string, Record<string, (...args: never[]) => unknown>>) => Object.assign(globalThis, { __vTrackS: { prisma } })

test("the settings route keys each setting's error by the setting, not by its place in the list (V spec §6.1)", async () => {
  type SettingsRoute = { PUT(request: Request): Promise<Response> }
  const { PUT } = await load<SettingsRoute>("src/app/api/admin/settings/route.ts")
  stubDb({})
  const response = await PUT(jsonRequest("PUT", { settings: [
    { key: "asset_label_12_width_mm", value: "500" },
    { key: "company_name", value: "Glink" },
    { key: "ldap_sync_mode", value: "sometimes" },
    { key: "", value: "x" },
  ] }))
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    error: "Invalid request data",
    code: "VALIDATION_FAILED",
    fieldErrors: { "settings.3.key": "required", "settings.asset_label_12_width_mm": "labelWidthRange", "settings.ldap_sync_mode": "schedulerModeInvalid" },
  })
  const empty = await PUT(jsonRequest("PUT", { settings: [] }))
  assert.deepEqual((await empty.json() as { fieldErrors: unknown }).fieldErrors, { settings: "required" })
})
```

(The helper is named `stubDb`, not `useDb`: eslint's `react-hooks/rules-of-hooks` treats a `use…` call inside S8's loop as a hook.)

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-s.test.ts`. Expected to fail: "the settings route keys each setting's error by the setting, not by its place in the list (V spec §6.1)" — the body has `settings.0.value` and `settings.2.value`.
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin edits:** none (`tests/system-settings-route-secrets.test.ts` and `tests/rbac-route-matrix.test.ts` stay green unchanged).
- [ ] **Step 5: Verify.** `node --test tests/v-track-s.test.ts tests/system-settings-route-secrets.test.ts tests/rbac-route-matrix.test.ts`; `npm test` (2230 tests, 2229 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npx eslint tests/v-track-s.test.ts src/lib/field-errors.ts src/app/api/admin/settings/route.ts`. `src/lib/field-errors.ts` is 122 LF lines.
- [ ] **Step 6: Commit.** `git add src/lib/field-errors.ts src/app/api/admin/settings/route.ts tests/v-track-s.test.ts`, then `git commit -m "feat(api): the settings route keys field errors by setting (v-track plan 1 task 4, S4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 5 (S5): The asset batch names the row or common field that failed, duplicates per row (`src/app/api/assets/batch/route.ts`, `src/lib/asset-batch-create.ts`)

Spec §6.1 "Keys" (`rows.3.serialNumber`, `common.name`), §6.2 "the asset batch's duplicate serials and tags (per row)"; S-R12.

**Files:**
- Modify: `src/lib/asset-batch-create.ts` (CRLF), `src/app/api/assets/batch/route.ts` (LF: `i/lf w/lf`)
- Test: `tests/v-track-s.test.ts` (LF)

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `src/lib/asset-batch-create.ts:2` | `import type { AssetBatchCreateInput, AssetBatchRowInput } from "./validations/asset-batch.ts"` | it, then `import type { FieldErrors } from "./field-errors.ts"` | S-R12 |
| after the file's last function (`buildAssetBatchDuplicateCheckSummary`, ends at `:205`) | — | a blank line, `// The fields a batch row sets for itself; every other field of a batch item comes from the common part.`, `const assetBatchRowFields = new Set<PropertyKey>(["assetTag", "serialNumber", "custodianId", "departmentId", "currentLocationId", "homeLocationId", "remark"])`; `export function assetBatchItemIssuePath(index: number, path: readonly PropertyKey[]): PropertyKey[]` → `assetBatchRowFields.has(path[0]) ? ["rows", index, ...path] : ["common", ...path]`; `export function buildAssetBatchDuplicateFieldErrors(rows: Array<Pick<AssetBatchRowInput, "serialNumber" \| "assetTag">>, duplicates: { serialNumbers: string[]; assetTags: string[] }): FieldErrors` — both lists through `normalizedKey` into sets; for each row (by index) a non-empty `normalizedKey(row.serialNumber)` in the set gives `` `rows.${index}.serialNumber` ``: `"duplicate"`, the same for `assetTag`. One-line doc comment on each export | S-R12 |
| `src/app/api/assets/batch/route.ts:1` | `import { NextResponse } from "next/server"` | it, then `import { ZodError } from "zod"` | S-R12 |
| `:4` | `import { errorResponse } from "@/lib/api-response"` | it, then `import { fieldErrorResponse } from "@/lib/field-error-response"` | S-R9 |
| `:8-9` | `  type AssetBatchCreateItem,` / `  assetBatchCreateAuditRecordId,` | the same two lines, then `  assetBatchItemIssuePath,` | — |
| `:11` | `  buildAssetBatchDuplicateMessage,` | `  buildAssetBatchDuplicateFieldErrors,` then `  buildAssetBatchDuplicateMessage,` | — |
| `:63-72` | `    const duplicateMessage = buildAssetBatchDuplicateMessage({` … `      existingSerials: existingSerials.flatMap((asset) => (asset.serialNumber ? [asset.serialNumber] : [])),` / `      existingAssetTags: existingAssetTags.map((asset) => asset.assetTag),` / `    })` / blank / `    if (duplicateMessage) {` / `      return NextResponse.json({ error: duplicateMessage }, { status: 400 })` / `    }` | `    const existingSerialValues = existingSerials.flatMap((asset) => (asset.serialNumber ? [asset.serialNumber] : []))` / `    const existingAssetTagValues = existingAssetTags.map((asset) => asset.assetTag)` / the `buildAssetBatchDuplicateMessage({…})` call with `existingSerials: existingSerialValues,` and `existingAssetTags: existingAssetTagValues,` / blank / `    if (duplicateMessage) {` / `      return fieldErrorResponse({` / `        status: 400,` / `        error: duplicateMessage,` / `        fieldErrors: buildAssetBatchDuplicateFieldErrors(input.rows, {` / `          serialNumbers: [...duplicateBatchValues.serialNumbers, ...existingSerialValues],` / `          assetTags: [...duplicateBatchValues.assetTags, ...existingAssetTagValues],` / `        }),` / `      })` / `    }` | S-R12 |
| `:93-94` | `    }).map((asset) => {` / `      const parsed = assetSchema.parse(asset)` | `    }).map((asset, index) => {` / `      const parsed = parseAssetBatchItem(asset, index)` | S-R12 |
| after the POST (ends `:192`) | — | a blank line, a two-line comment (the per-row parse runs the asset rules the common part skips; its issue paths name no row, so they move under their row or the common part), then `function parseAssetBatchItem(asset: AssetBatchCreateItem, index: number) {` / `  try {` / `    return assetSchema.parse(asset)` / `  } catch (error) {` / `    if (!(error instanceof ZodError)) throw error` / `    throw new ZodError(error.issues.map((issue) => ({ ...issue, path: assetBatchItemIssuePath(index, issue.path) })))` / `  }` / `}` | S-R12 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-s.test.ts`:

```ts

test("the asset batch names the row or the common field that failed, duplicates included (V spec §6.1, §6.2)", async () => {
  type BatchRoute = { POST(request: Request): Promise<Response> }
  type BatchCreate = typeof import("../src/lib/asset-batch-create.ts")
  const { POST } = await load<BatchRoute>("src/app/api/assets/batch/route.ts")
  const { assetBatchItemIssuePath, buildAssetBatchDuplicateFieldErrors } = await load<BatchCreate>("src/lib/asset-batch-create.ts")
  assert.deepEqual(assetBatchItemIssuePath(2, ["serialNumber"]), ["rows", 2, "serialNumber"])
  assert.deepEqual(assetBatchItemIssuePath(2, ["licenseUsedSeats"]), ["common", "licenseUsedSeats"])
  assert.deepEqual(buildAssetBatchDuplicateFieldErrors(
    [{ serialNumber: "SN-1", assetTag: null }, { serialNumber: " sn-1 ", assetTag: "T-9" }, { serialNumber: "SN-2", assetTag: "t-9" }],
    { serialNumbers: ["sn-1"], assetTags: ["T-9"] },
  ), { "rows.0.serialNumber": "duplicate", "rows.1.serialNumber": "duplicate", "rows.1.assetTag": "duplicate", "rows.2.assetTag": "duplicate" })

  const common = {
    name: "Laptop", categoryId: "category-1", companyId: "company-1", branchId: "branch-1", currentLocationId: "location-1",
    statusId: "status-ready", conditionId: "condition-new", ownershipType: "stock", licenseTotalSeats: "", licenseUsedSeats: "",
    purchaseDate: "", purchasePrice: "", warrantyStartDate: "", warrantyEndDate: "",
  }
  const rows = [{ clientId: "r1", assetTag: "T-1", serialNumber: "SN-1" }, { clientId: "r2", assetTag: "T-2", serialNumber: "SN-OLD" }, { clientId: "r3", assetTag: "T-3", serialNumber: "SN-1" }]
  stubDb({
    assetStatus: { findFirst: () => ({ id: "status-ready", name: "Ready", isActive: true }) },
    assetCondition: { findFirst: () => ({ id: "condition-new", name: "New", isActive: true }) },
    asset: { findMany: (args: { where: { serialNumber?: unknown } }) => (args.where.serialNumber ? [{ serialNumber: "SN-OLD" }] : []) },
  })

  // Nested zod paths stay dotted.
  const invalid = await POST(jsonRequest("POST", { common: { ...common, name: "" }, rows: [{ clientId: "r1", serialNumber: "x".repeat(101) }, { clientId: "r2" }] }))
  assert.equal(invalid.status, 400)
  const invalidBody = await invalid.json() as { fieldErrors: Record<string, string> }
  assert.equal(invalidBody.fieldErrors["common.name"], "required")
  // Serials repeated in the batch or already registered: each row says so under its serial number.
  const duplicates = await POST(jsonRequest("POST", { common, rows }))
  assert.equal(duplicates.status, 400)
  const duplicateBody = await duplicates.json() as { error: string; fieldErrors: Record<string, string> }
  assert.match(duplicateBody.error, /^พบข้อมูลซ้ำ: /)
  assert.deepEqual(duplicateBody.fieldErrors, { "rows.0.serialNumber": "duplicate", "rows.1.serialNumber": "duplicate", "rows.2.serialNumber": "duplicate" })
  // The per-row parse runs the license rule the common part skips; its issue goes to the common field, not to a bare key.
  const license = await POST(jsonRequest("POST", {
    common: { ...common, ownershipType: "software_license", licenseTotalSeats: "2", licenseUsedSeats: "5" },
    rows: [{ clientId: "r1", assetTag: "T-1" }, { clientId: "r2", assetTag: "T-2" }],
  }))
  assert.equal(license.status, 400)
  assert.deepEqual(await license.json(), { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { "common.licenseUsedSeats": "licenseSeatsExceeded" } })
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-s.test.ts`. Expected to fail: "the asset batch names the row or the common field that failed, duplicates included (V spec §6.1, §6.2)" (`TypeError: assetBatchItemIssuePath is not a function`).
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin edits:** none (`tests/asset-batch-route.test.ts` and `tests/asset-batch-create.test.ts` stay green unchanged).
- [ ] **Step 5: Verify.** `node --test tests/v-track-s.test.ts tests/asset-batch-route.test.ts tests/asset-batch-create.test.ts`; `npm test` (2231 tests, 2230 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit` (the helper's rows are `Pick<…>`, so the test passes rows without `clientId`); `npx eslint tests/v-track-s.test.ts src/lib/asset-batch-create.ts src/app/api/assets/batch/route.ts`.
- [ ] **Step 6: Commit.** `git add src/lib/asset-batch-create.ts src/app/api/assets/batch/route.ts tests/v-track-s.test.ts`, then `git commit -m "feat(api): the asset batch names the row or common field that failed, duplicates per row (v-track plan 1 task 5, S5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 6 (S6): Checkout's handover refusal and disposal execution's evidence refusal add fieldErrors (`src/app/api/assets/[id]/checkout/route.ts`, `src/app/api/disposal-requests/[id]/route.ts`, `src/lib/disposal-api-errors.ts`)

Spec §6.1, last two points; S-R9.

**Files:**
- Modify: `src/app/api/assets/[id]/checkout/route.ts`, `src/lib/disposal-api-errors.ts` (CRLF); `src/app/api/disposal-requests/[id]/route.ts` (`w/mixed`: mostly CRLF with some LF lines; an exact-string edit keeps each line's ending, never normalize the file)
- Test: `tests/v-track-s.test.ts` (LF)

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `src/app/api/assets/[id]/checkout/route.ts:6` | `import { errorResponse } from "@/lib/api-response"` | it, then `import { issuesToFieldErrors } from "@/lib/field-errors"` | — |
| `:227` | `      if (issue) return NextResponse.json({ code: issue.message, error: issue.message }, { status: 400 })` | `      if (issue) {` / `        return NextResponse.json({ code: issue.message, error: issue.message, fieldErrors: issuesToFieldErrors(error.issues) }, { status: 400 })` / `      }` | S-R9 |
| `src/app/api/disposal-requests/[id]/route.ts:6` | `import { errorResponse } from "@/lib/api-response"` | it, then `import { issuesToFieldErrors } from "@/lib/field-errors"` | — |
| `:211-214` | `        return disposalApiError(` / `          "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED",` / `          "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED",` / `        )` | the same call with two more arguments before `)`: `          400,` / `          issuesToFieldErrors(error.issues),` | S-R9 |
| `src/lib/disposal-api-errors.ts:2` | `import type { DisposalApiErrorCode } from "./disposal-api-error-codes.ts"` | it, then `import type { FieldErrors } from "./field-errors.ts"` | — |
| `:7-8` | `export function disposalApiError(code: DisposalApiErrorCode, error: string, status = 400) {` / `  return NextResponse.json({ code, error }, { status })` | `export function disposalApiError(code: DisposalApiErrorCode, error: string, status = 400, fieldErrors?: FieldErrors) {` / `  return NextResponse.json(fieldErrors ? { code, error, fieldErrors } : { code, error }, { status })` | S-R9 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-s.test.ts`:

```ts

test("checkout's HANDOVER_* refusal and disposal execution's evidence refusal keep their code and add fieldErrors (V spec §6.1)", async () => {
  type CheckoutRoute = { POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }
  const { POST } = await load<CheckoutRoute>("src/app/api/assets/[id]/checkout/route.ts")
  stubDb({})
  const response = await POST(jsonRequest("POST", {
    handoverMode: "temporary_loan", checkoutType: "user", custodianId: "employee-1", departmentId: "", locationId: "", parentAssetId: "",
    checkoutDate: "2026-10-17", expectedReturnDate: "", conditionBefore: "condition-good", remark: "", receiverSignature: "",
  }), { params: Promise.resolve({ id: "asset-1" }) })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "HANDOVER_TEMPORARY_DUE_DATE_REQUIRED",
    error: "HANDOVER_TEMPORARY_DUE_DATE_REQUIRED",
    fieldErrors: { expectedReturnDate: "handoverTemporaryDueDateRequired" },
  })

  // The disposal route loads services node --test cannot strip, so its branch is read as source; the helper is run.
  const { disposalApiError } = await load<typeof import("../src/lib/disposal-api-errors.ts")>("src/lib/disposal-api-errors.ts")
  assert.deepEqual(await disposalApiError("DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED", "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED").json(), {
    code: "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED", error: "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED",
  })
  const withFields = disposalApiError("DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED", "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED", 400, { evidenceExceptionReason: "tooLong" })
  assert.equal(withFields.status, 400)
  assert.deepEqual(await withFields.json(), {
    code: "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED", error: "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED", fieldErrors: { evidenceExceptionReason: "tooLong" },
  })
  const route = read("src/app/api/disposal-requests/[id]/route.ts")
  assert.match(route, /if \(error\.issues\.some\(\(issue\) => issue\.path\[0\] === "evidenceExceptionReason"\)\) \{\n        return disposalApiError\(\n          "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED",\n          "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED",\n          400,\n          issuesToFieldErrors\(error\.issues\),\n        \)/)
  assert.match(route, /^import \{ issuesToFieldErrors \} from "@\/lib\/field-errors"$/m)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-s.test.ts`. Expected to fail: "checkout's HANDOVER_* refusal and disposal execution's evidence refusal keep their code and add fieldErrors (V spec §6.1)" (the checkout body has no `fieldErrors`).
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin edits:** none. `tests/disposal-route-structure.test.ts` "execution sanitizes unexpected infrastructure failures" stays green (`issue.path[0] === "evidenceExceptionReason"` and the code string stay).
- [ ] **Step 5: Verify.** `node --test tests/v-track-s.test.ts tests/disposal-route-structure.test.ts tests/asset-handover-checkout.test.ts`; `npm test` (2232 tests, 2231 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npx eslint tests/v-track-s.test.ts src/lib/disposal-api-errors.ts "src/app/api/disposal-requests/[id]/route.ts" "src/app/api/assets/[id]/checkout/route.ts"`.
- [ ] **Step 6: Commit.** `git add "src/app/api/assets/[id]/checkout/route.ts" "src/app/api/disposal-requests/[id]/route.ts" src/lib/disposal-api-errors.ts tests/v-track-s.test.ts`, then `git commit -m "feat(api): checkout's handover refusal and disposal execution's evidence refusal add fieldErrors (v-track plan 1 task 6, S6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 7 (S7): Supplier answers with the shared body and field codes (`src/app/api/suppliers/**`, `src/lib/supplier-form-errors.ts`, `src/components/master-data/supplier-form.tsx`)

Spec §6.1 "Supplier moves to the shared body and codes"; U9; S-R10.

**Files:**
- Modify: `src/app/api/suppliers/route.ts`, `src/app/api/suppliers/[id]/route.ts`, `src/lib/supplier-form-errors.ts`, `src/components/master-data/supplier-form.tsx`, `src/lib/api-error-catalog.ts` (CRLF)
- Delete: `src/lib/supplier-api-error.ts`, `tests/supplier-api-error.test.ts` (`git rm`)
- Modify: `messages/th.json`, `messages/en.json` (through `scripts/messages-edit.mjs`)
- Modify: `tests/supplier-form-errors.test.ts` (CRLF; pins)
- Test: `tests/v-track-s.test.ts` (LF)

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `src/app/api/suppliers/route.ts:7` and `src/app/api/suppliers/[id]/route.ts:9` | `import { getSupplierApiError } from "@/lib/supplier-api-error"` | `import { isPrismaUniqueConstraintError, uniqueConflictResponse } from "@/lib/field-error-response"` | S-R10 |
| `src/app/api/suppliers/route.ts:70-72` and `src/app/api/suppliers/[id]/route.ts:103-105` | `    const supplierError = getSupplierApiError(error)` / `    if (supplierError) return NextResponse.json(supplierError.payload, { status: supplierError.status })` / `    return errorResponse(error, 400)` | `    if (isPrismaUniqueConstraintError(error)) return uniqueConflictResponse("code", "Supplier code already exists")` / `    return errorResponse(error, 400)` | S-R10 |
| `src/lib/supplier-form-errors.ts:13-18` | `export const supplierFormErrorCodes = [` / `  "required",` / `  "invalid_email",` / `  "too_long",` / `  "duplicate_code",` / `] as const` | `// The shared field codes (src/lib/field-errors.ts) the supplier form shows; the server sends them for every route.` / `export const supplierFormErrorCodes = [` / `  "required",` / `  "invalidEmail",` / `  "tooLong",` / `  "duplicate",` / `] as const` | S-R10 |
| `src/components/master-data/supplier-form.tsx:105-107` | `    if (code === "duplicate_code") return t("duplicateCode")` / `    if (code === "invalid_email") return t("invalidEmail")` / `    if (code === "too_long") return t("fieldTooLong")` | `    if (code === "duplicate") return t("duplicateCode")` / `    if (code === "invalidEmail") return t("invalidEmail")` / `    if (code === "tooLong") return t("fieldTooLong")` | S-R10 |
| `src/lib/api-error-catalog.ts:157` | `  "Invalid supplier data": "invalidSupplierData",` | (line removed) | S-R10 |
| messages | `apiErrors.invalidSupplierData` | change file `{"delete":["apiErrors.invalidSupplierData"]}` (prints `messages updated: 0 th, 0 en, 1 deleted`) | S-R10 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-s.test.ts`:

```ts

const uniqueViolation = () => Object.assign(new Error("Unique constraint failed"), { name: "PrismaClientKnownRequestError", code: "P2002" })

test("supplier answers with the shared body and codes: 400 VALIDATION_FAILED with fieldErrors, 409 DUPLICATE on code (V spec §6.1)", async () => {
  type Create = { POST(request: Request): Promise<Response> }
  type Update = { PUT(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }
  const { POST } = await load<Create>("src/app/api/suppliers/route.ts")
  const { PUT } = await load<Update>("src/app/api/suppliers/[id]/route.ts")
  const supplier = { code: "SUP-1", name: "Vendor", contactPerson: "", phone: "", email: "", address: "", isActive: true }

  stubDb({})
  const invalid = await POST(jsonRequest("POST", { ...supplier, code: "", email: "not-an-email", phone: "x".repeat(51) }))
  assert.equal(invalid.status, 400)
  assert.deepEqual(await invalid.json(), { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { code: "required", phone: "tooLong", email: "invalidEmail" } })

  stubDb({ supplier: { create: () => { throw uniqueViolation() } } })
  const created = await POST(jsonRequest("POST", supplier))
  assert.equal(created.status, 409)
  assert.deepEqual(await created.json(), { error: "Supplier code already exists", code: "DUPLICATE", fieldErrors: { code: "duplicate" } })

  stubDb({ supplier: { findFirst: () => ({ id: "s1", isActive: true, _count: { assets: 0, maintenanceTickets: 0, maintenancePlans: 0, purchaseDocuments: 0 } }), update: () => { throw uniqueViolation() } } })
  const updated = await PUT(jsonRequest("PUT", supplier), { params: Promise.resolve({ id: "s1" }) })
  assert.equal(updated.status, 409)
  assert.deepEqual(await updated.json(), { error: "Supplier code already exists", code: "DUPLICATE", fieldErrors: { code: "duplicate" } })

  // The supplier-only body and its snake codes are gone; the supplier form reads the shared codes until it moves to the hook.
  assert.equal(existsSync("src/lib/supplier-api-error.ts"), false)
  const { parseSupplierFormError } = await load<typeof import("../src/lib/supplier-form-errors.ts")>("src/lib/supplier-form-errors.ts")
  assert.deepEqual(parseSupplierFormError({ error: "Invalid request data", fieldErrors: { code: "duplicate", email: "invalidEmail", phone: "tooLong", name: "required" } }).fieldErrors, { code: "duplicate", name: "required", phone: "tooLong", email: "invalidEmail" })
  const form = read("src/components/master-data/supplier-form.tsx")
  assert.match(form, /if \(code === "duplicate"\) return t\("duplicateCode"\)\n    if \(code === "invalidEmail"\) return t\("invalidEmail"\)\n    if \(code === "tooLong"\) return t\("fieldTooLong"\)/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-s.test.ts`. Expected to fail: "supplier answers with the shared body and codes: 400 VALIDATION_FAILED with fieldErrors, 409 DUPLICATE on code (V spec §6.1)" (the body is `{ error: "Invalid supplier data", fieldErrors: … }`).
- [ ] **Step 3: Implement** per the Changes table, then `git rm src/lib/supplier-api-error.ts tests/supplier-api-error.test.ts`.
- [ ] **Step 4: Pin edits** in `tests/supplier-form-errors.test.ts` (test "parses only supported supplier field error codes"; each old string occurs once):
  - old `      error: "Invalid supplier data",` / `      fieldErrors: {` / `        code: "duplicate_code",` / `        email: "invalid_email",` / `        unknown: "too_long",` → new `      error: "Invalid request data",` / `      fieldErrors: {` / `        code: "duplicate",` / `        email: "invalidEmail",` / `        unknown: "tooLong",`
  - old `      message: "Invalid supplier data",` / `      fieldErrors: {` / `        code: "duplicate_code",` / `        email: "invalid_email",` → new `      message: "Invalid request data",` / `      fieldErrors: {` / `        code: "duplicate",` / `        email: "invalidEmail",`
  `tests/supplier-form-ui.test.ts` stays green unchanged (it pins `parseSupplierFormError` and `getErrorMessage(…)`, which stay).
- [ ] **Step 5: Verify.** `node --test tests/v-track-s.test.ts tests/supplier-form-errors.test.ts tests/supplier-form-ui.test.ts tests/api-error-catalog.test.ts tests/messages-parity.test.ts`; `npm test` (2229 tests, 2228 pass, 0 fail, 1 skipped; +1, −4: the deleted `tests/supplier-api-error.test.ts`); `npx tsc --noEmit`; `npx eslint tests src/lib src/app/api/suppliers src/components/master-data/supplier-form.tsx`. `grep -rn "supplier-api-error\|getSupplierApiError\|duplicate_code\|invalid_email\|too_long" src tests` prints only the `existsSync("src/lib/supplier-api-error.ts")` line of `tests/v-track-s.test.ts`. Messages: 4067 leaf keys.
- [ ] **Step 6: Commit.** `git add src/app/api/suppliers src/lib/supplier-form-errors.ts src/lib/api-error-catalog.ts src/components/master-data/supplier-form.tsx messages tests/supplier-form-errors.test.ts tests/v-track-s.test.ts` (Step 3's `git rm` already staged the two deletions; naming a removed path here makes git stop with "pathspec … did not match any files" and stage nothing), then `git commit -m "refactor(api): supplier answers with the shared body and field codes (v-track plan 1 task 7, S7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 8 (S8): Duplicate codes and names in master data answer 409 under their field (12 master-data routes, 2 category routes)

Spec §6.2 "Duplicate values that end in a 500 today"; U9; S-R8.

**Files:**
- Modify: `src/app/api/{companies,departments,employees,locations,brands,models}/route.ts` and `…/[id]/route.ts` (12 files: the two `companies` files CRLF, the other ten LF)
- Modify: `src/app/api/categories/route.ts`, `src/app/api/categories/[id]/route.ts` (LF)
- Modify: `src/lib/api-error-catalog.ts` (CRLF); `messages/th.json`, `messages/en.json` (through `scripts/messages-edit.mjs`)
- Test: `tests/v-track-s.test.ts` (LF)

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| each of the 12 files, the `import { errorResponse } from "@/lib/api-response"` line (`companies/route.ts:5` … each occurs once) | it | it, then `import { isPrismaUniqueConstraintError, uniqueConflictResponse } from "@/lib/field-error-response"` | S-R5 |
| each of the 12 files, the only `    return errorResponse(error, 400)` (POST in `route.ts`: companies `:62`, departments `:70`, employees `:71`, locations `:84`, brands `:54`, models `:61`; PUT in `[id]/route.ts`: companies `:67`, departments `:75`, employees `:77`, locations `:102`, brands `:59`, models `:63`) | `    return errorResponse(error, 400)` | `    if (isPrismaUniqueConstraintError(error)) return uniqueConflictResponse("<field>", "<message>")` / `    return errorResponse(error, 400)`, with field and message: companies `code` "Company code already exists"; departments `code` "Department code already exists"; employees `code` "Employee code already exists"; locations `code` "Location code already exists"; brands `name` "Brand name already exists"; models `name` "Model name already exists for this brand" | S-R8 |
| `src/app/api/categories/route.ts:5` and `[id]/route.ts:5` | `import { errorResponse } from "@/lib/api-response"` | it, then `import { uniqueConflictResponse } from "@/lib/field-error-response"` | — |
| `src/app/api/categories/route.ts:51-52` | `    const input = categorySchema.parse(await request.json())` / `    const existingInactiveCategory = await prisma.assetCategory.findFirst({` | between them: `    // An inactive category with this code is brought back below; an active one is a duplicate (V track spec §6.2).` / `    const activeDuplicate = await prisma.assetCategory.findFirst({ where: { code: input.code, isActive: true }, select: { id: true } })` / `    if (activeDuplicate) return uniqueConflictResponse("code", "Category code already exists")` | S-R8 |
| `src/app/api/categories/[id]/route.ts:62-65` | `    if (!existing) {` / `      return NextResponse.json({ error: "Category not found" }, { status: 404 })` / `    }` / `    if (!input.isActive) {` | between `    }` and `    if (!input.isActive) {`: `    // The code is unique across active and inactive categories (V track spec §6.2).` / `    const duplicate = await prisma.assetCategory.findFirst({ where: { code: input.code, id: { not: id } }, select: { id: true } })` / `    if (duplicate) return uniqueConflictResponse("code", "Category code already exists")` | S-R8 |
| `src/lib/api-error-catalog.ts`, in sorted place | — | 7 lines, each directly after the line named: after `"Branch not found": "branchNotFound",` → `  "Brand name already exists": "brandNameExists",`; after `"Cannot remove or deactivate the last active system administrator": "lastSystemAdmin",` → `  "Category code already exists": "categoryCodeExists",`; after `"Category not found": "categoryNotFound",` → `  "Company code already exists": "companyCodeExists",`; after `"Default asset label tape size must be 12, 18, 24, or custom": "labelTapeSizeInvalid",` → `  "Department code already exists": "departmentCodeExists",`; after `"Employee cannot be their own manager": "employeeOwnManager",` → `  "Employee code already exists": "employeeCodeExists",`; after `"Location cannot be its own parent": "locationOwnParent",` → `  "Location code already exists": "locationCodeExists",`; after `"Missing SQL Server connection settings in environment variables": "dbSettingsMissing",` → `  "Model name already exists for this brand": "modelNameExists",` | S-R8 |
| messages | — | change file: `set.th`: `apiErrors.companyCodeExists` "รหัสบริษัทนี้มีอยู่แล้ว", `apiErrors.departmentCodeExists` "รหัสแผนกนี้มีอยู่แล้ว", `apiErrors.employeeCodeExists` "รหัสพนักงานนี้มีอยู่แล้ว", `apiErrors.locationCodeExists` "รหัสที่ตั้งนี้มีอยู่แล้ว", `apiErrors.brandNameExists` "ชื่อยี่ห้อนี้มีอยู่แล้ว", `apiErrors.modelNameExists` "ชื่อรุ่นนี้มีอยู่แล้วในยี่ห้อนี้", `apiErrors.categoryCodeExists` "รหัสหมวดหมู่นี้มีอยู่แล้ว"; `set.en`: the same keys with the English catalog messages above (prints `messages updated: 7 th, 7 en, 0 deleted`). Wording follows the existing `supplierCodeExists` "รหัสผู้ขายนี้มีอยู่แล้ว" and the field labels (`company.code` "รหัสบริษัท", `location.code` "รหัสที่ตั้ง", `brandModel.brandName` "ชื่อยี่ห้อ") | glossary |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-s.test.ts`:

```ts

test("a duplicate code or name in master data answers 409 under its field, on create and on update (V spec §6.2)", async (t) => {
  t.mock.method(console, "error", () => {})
  type Create = { POST(request: Request): Promise<Response> }
  type Update = { PUT(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }
  const cases = [
    { dir: "companies", model: "company", field: "code", error: "Company code already exists", key: "companyCodeExists", th: "รหัสบริษัทนี้มีอยู่แล้ว", body: { code: "C1", assetTagCode: "", nameTh: "บริษัท", nameEn: "", taxId: "", address: "", isActive: true } },
    { dir: "departments", model: "department", field: "code", error: "Department code already exists", key: "departmentCodeExists", th: "รหัสแผนกนี้มีอยู่แล้ว", body: { code: "D1", name: "IT", companyId: "", isActive: true } },
    { dir: "employees", model: "employee", field: "code", error: "Employee code already exists", key: "employeeCodeExists", th: "รหัสพนักงานนี้มีอยู่แล้ว", body: { code: "E1", fullNameTh: "สมชาย", fullNameEn: "", email: "", companyId: "c1", branchId: "b1", departmentId: "d1", position: "", employmentStatus: "active", managerId: "", isActive: true } },
    { dir: "locations", model: "location", field: "code", error: "Location code already exists", key: "locationCodeExists", th: "รหัสที่ตั้งนี้มีอยู่แล้ว", body: { code: "L1", name: "Store", branchId: "b1", parentId: "", locationType: "Room", description: "", isActive: true } },
    { dir: "brands", model: "assetBrand", field: "name", error: "Brand name already exists", key: "brandNameExists", th: "ชื่อยี่ห้อนี้มีอยู่แล้ว", body: { name: "Dell", isActive: true } },
    { dir: "models", model: "assetModel", field: "name", error: "Model name already exists for this brand", key: "modelNameExists", th: "ชื่อรุ่นนี้มีอยู่แล้วในยี่ห้อนี้", body: { name: "Latitude", categoryId: "cat-1", brandId: "brand-1", specs: "", isActive: true } },
  ]
  const { getApiErrorKey } = await load<typeof import("../src/lib/api-error-catalog.ts")>("src/lib/api-error-catalog.ts")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).apiErrors
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")).apiErrors
  const expectConflict = async (response: Response, item: (typeof cases)[number]) => {
    assert.equal(response.status, 409, item.dir)
    assert.deepEqual(await response.json(), { error: item.error, code: "DUPLICATE", fieldErrors: { [item.field]: "duplicate" } }, item.dir)
  }
  for (const item of cases) {
    const { POST } = await load<Create>(`src/app/api/${item.dir}/route.ts`)
    const { PUT } = await load<Update>(`src/app/api/${item.dir}/[id]/route.ts`)
    stubDb({ [item.model]: { create: () => { throw uniqueViolation() }, findFirst: () => ({ id: "row-1", isActive: true }), update: () => { throw uniqueViolation() } } })
    await expectConflict(await POST(jsonRequest("POST", item.body)), item)
    await expectConflict(await PUT(jsonRequest("PUT", item.body), { params: Promise.resolve({ id: "row-1" }) }), item)
    assert.equal(getApiErrorKey(item.error), item.key)
    assert.equal(th[item.key], item.th)
    assert.equal(en[item.key], item.error)
  }

  // Category: create answers 409 for an active duplicate (an inactive one is still brought back), update for any other row
  // with the code. Checked before writing, because the nested custom-field rows have a unique index of their own.
  const category = { code: "IT", name: "IT", description: "", isActive: true, customFieldDefs: [], photoChecklist: [] }
  const categoryCase = { dir: "categories", field: "code", error: "Category code already exists", key: "categoryCodeExists", th: "รหัสหมวดหมู่นี้มีอยู่แล้ว" } as (typeof cases)[number]
  const { POST } = await load<Create>("src/app/api/categories/route.ts")
  const { PUT } = await load<Update>("src/app/api/categories/[id]/route.ts")
  const lookups: unknown[] = []
  stubDb({ assetCategory: { findFirst: (args: { where: Record<string, unknown> }) => { lookups.push(args.where); return args.where.id ? { id: "cat-1", isActive: true, _count: { assets: 0, models: 0 } } : { id: "cat-2" } } } })
  await expectConflict(await POST(jsonRequest("POST", category)), categoryCase)
  await expectConflict(await PUT(jsonRequest("PUT", category), { params: Promise.resolve({ id: "cat-1" }) }), categoryCase)
  assert.deepEqual(lookups, [{ code: "IT", isActive: true }, { id: "cat-1", isActive: true }, { code: "IT", id: { not: "cat-1" } }])
  assert.equal(getApiErrorKey(categoryCase.error), categoryCase.key)
  assert.equal(th[categoryCase.key], categoryCase.th)
  assert.equal(en[categoryCase.key], categoryCase.error)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-s.test.ts`. Expected to fail: "a duplicate code or name in master data answers 409 under its field, on create and on update (V spec §6.2)" (companies answers 500; the test hides the `[api error] ref …` log).
- [ ] **Step 3: Implement** per the Changes table (the 12 route edits are the same two exact-string replacements per file with the field and message of its row).
- [ ] **Step 4: Pin edits:** none (`tests/category-delete-guard.test.ts`, `tests/api-error-exposure.test.ts` "routes that answered with error.message now go through the same rule" stay green).
- [ ] **Step 5: Verify.** `node --test tests/v-track-s.test.ts tests/api-error-catalog.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts tests/category-delete-guard.test.ts tests/rbac-route-matrix.test.ts`; `npm test` (2230 tests, 2229 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npx eslint tests/v-track-s.test.ts src/app/api src/lib/api-error-catalog.ts`. Messages: 4074 leaf keys.
- [ ] **Step 6: Commit.** `git add src/app/api/companies src/app/api/departments src/app/api/employees src/app/api/locations src/app/api/brands src/app/api/models src/app/api/categories src/lib/api-error-catalog.ts messages tests/v-track-s.test.ts`, then `git commit -m "feat(api): duplicate codes and names in master data answer 409 under their field (v-track plan 1 task 8, S8)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 9 (S9): Admin and master-data refusals about one field name it (`src/app/api/admin/{users,roles}/**`, `src/app/api/branches/**`, `src/app/api/employees/[id]`, `src/app/api/locations/[id]`)

Spec §6.2 (username exists, role name exists, branch code exists, invalid permission selection, employee is their own manager, location is its own parent or forms a cycle, "Password is required"); S-R6, S-R7.

**Files:**
- Modify (CRLF): `src/app/api/admin/users/route.ts`, `src/app/api/admin/users/[id]/route.ts`, `src/app/api/admin/roles/route.ts`, `src/app/api/admin/roles/[id]/route.ts`; (LF): `src/app/api/branches/route.ts`, `src/app/api/branches/[id]/route.ts`, `src/app/api/employees/[id]/route.ts`, `src/app/api/locations/[id]/route.ts`
- Test: `tests/v-track-s.test.ts` (LF)

**Changes at 71e5251** (after S8: `employees/[id]` and `locations/[id]` already import `isPrismaUniqueConstraintError, uniqueConflictResponse` from `@/lib/field-error-response` on line 6; there the import line is **widened**, not added, so the file never imports the module twice):

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `admin/users/route.ts:6` | `import { errorResponse } from "@/lib/api-response"` | it, then `import { fieldErrorResponse } from "@/lib/field-error-response"` and `import { FieldRefusalError } from "@/lib/field-errors"` | — |
| `admin/users/route.ts:42` | `      return NextResponse.json({ error: "Password is required" }, { status: 400 })` | `      return fieldErrorResponse({ status: 400, error: "Password is required", fieldErrors: { password: "required" } })` | S-R7 |
| `admin/users/route.ts:98`, `admin/users/[id]/route.ts:103` | `  if (existing) throw new Error("Username already exists")` | `  if (existing) throw new FieldRefusalError("Username already exists", { username: "duplicate" })` | S-R6 |
| `admin/users/[id]/route.ts:6` | `import { errorResponse } from "@/lib/api-response"` | it, then `import { FieldRefusalError } from "@/lib/field-errors"` | — |
| `admin/roles/route.ts:5` | `import { errorResponse } from "@/lib/api-response"` | it, then `import { fieldErrorResponse, uniqueConflictResponse } from "@/lib/field-error-response"` | — |
| `admin/roles/route.ts:17` | `    if (existing) return NextResponse.json({ error: "Role name already exists" }, { status: 409 })` | `    if (existing) return uniqueConflictResponse("name", "Role name already exists")` | S-R7, S-R9 |
| `admin/roles/route.ts:24`, `admin/roles/[id]/route.ts:36` | `      return NextResponse.json({ error: "Invalid permission selection" }, { status: 400 })` | `      return fieldErrorResponse({ status: 400, error: "Invalid permission selection", fieldErrors: { permissionIds: "invalidPermissionSelection" } })` | S-R7 |
| `admin/roles/[id]/route.ts:5` | `import { errorResponse } from "@/lib/api-response"` | it, then `import { fieldErrorResponse } from "@/lib/field-error-response"` | — |
| `branches/route.ts:5`, `branches/[id]/route.ts:5` | `import { errorResponse } from "@/lib/api-response"` | it, then `import { fieldErrorResponse } from "@/lib/field-error-response"` | — |
| `branches/route.ts:62-69`, `branches/[id]/route.ts:67-74` | `    if (existingCode) {` / `      return NextResponse.json(` / `        {` / ``          error: `รหัสสาขา ${input.code} มีอยู่แล้วในบริษัท ${existingCode.company.code} - ${existingCode.company.nameTh}`,`` / `        },` / `        { status: 400 }` / `      )` / `    }` | `    if (existingCode) {` / `      return fieldErrorResponse({` / `        status: 400,` / the same `error:` line, indented 8 / `        fieldErrors: { code: "duplicate" },` / `      })` / `    }` | S-R7 |
| `employees/[id]/route.ts:6`, `locations/[id]/route.ts:6` (S8's line) | `import { isPrismaUniqueConstraintError, uniqueConflictResponse } from "@/lib/field-error-response"` | `import { fieldErrorResponse, isPrismaUniqueConstraintError, uniqueConflictResponse } from "@/lib/field-error-response"` | — |
| `employees/[id]/route.ts:55` | `      return NextResponse.json({ error: "Employee cannot be their own manager" }, { status: 400 })` | `      return fieldErrorResponse({ status: 400, error: "Employee cannot be their own manager", fieldErrors: { managerId: "employeeOwnManager" } })` | S-R7 |
| `locations/[id]/route.ts:58` | `      return NextResponse.json({ error: "Location cannot be its own parent" }, { status: 400 })` | `      return fieldErrorResponse({ status: 400, error: "Location cannot be its own parent", fieldErrors: { parentId: "locationOwnParent" } })` | S-R7 |
| `locations/[id]/route.ts:79` | `        return NextResponse.json({ error: "Location hierarchy cannot contain a cycle" }, { status: 400 })` | `        return fieldErrorResponse({ status: 400, error: "Location hierarchy cannot contain a cycle", fieldErrors: { parentId: "locationCycle" } })` | S-R7 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-s.test.ts`:

```ts

test("admin and master-data refusals about one field name it: username, password, role name, permissions, branch code, manager, parent (V spec §6.2)", async () => {
  type Create = { POST(request: Request): Promise<Response> }
  type Update = { PUT(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }
  const params = (id: string) => ({ params: Promise.resolve({ id }) })
  const expectBody = async (response: Response, status: number, body: unknown) => {
    assert.equal(response.status, status)
    assert.deepEqual(await response.json(), body)
  }

  const users = await load<Create>("src/app/api/admin/users/route.ts")
  const user = { username: "somchai", password: "", displayName: "Somchai", email: "", employeeId: "", roleIds: ["role-employee"], isActive: true }
  stubDb({ role: { findMany: () => [{ id: "role-employee", name: "employee", isActive: true, rolePermissions: [] }] }, user: { findUnique: () => ({ id: "u-9" }) } })
  await expectBody(await users.POST(jsonRequest("POST", user)), 400, { error: "Password is required", fieldErrors: { password: "required" } })
  await expectBody(await users.POST(jsonRequest("POST", { ...user, password: "a-strong-password" })), 400, { error: "Username already exists", fieldErrors: { username: "duplicate" } })
  const userUpdate = read("src/app/api/admin/users/[id]/route.ts")
  assert.match(userUpdate, /if \(existing\) throw new FieldRefusalError\("Username already exists", \{ username: "duplicate" \}\)/)
  assert.doesNotMatch(userUpdate, /throw new Error\("Username already exists"\)/)

  const roles = await load<Create>("src/app/api/admin/roles/route.ts")
  const role = { name: "store_keeper", displayName: "Store keeper", displayNameTh: "", description: "", isActive: true, permissionIds: ["perm-1"] }
  stubDb({ role: { findUnique: () => ({ id: "role-1" }) } })
  await expectBody(await roles.POST(jsonRequest("POST", role)), 409, { error: "Role name already exists", code: "DUPLICATE", fieldErrors: { name: "duplicate" } })
  stubDb({ role: { findUnique: () => null }, permission: { findMany: () => [] } })
  await expectBody(await roles.POST(jsonRequest("POST", role)), 400, { error: "Invalid permission selection", fieldErrors: { permissionIds: "invalidPermissionSelection" } })
  assert.match(read("src/app/api/admin/roles/[id]/route.ts"), /return fieldErrorResponse\(\{ status: 400, error: "Invalid permission selection", fieldErrors: \{ permissionIds: "invalidPermissionSelection" \} \}\)/)

  const branches = await load<Create>("src/app/api/branches/route.ts")
  stubDb({ branch: { findFirst: () => ({ id: "branch-2", company: { code: "GL", nameTh: "จีลิงค์" } }) } })
  await expectBody(await branches.POST(jsonRequest("POST", { code: "BKK", name: "Bangkok", companyId: "c1", address: "", contactPerson: "", isActive: true })), 400, {
    error: "รหัสสาขา BKK มีอยู่แล้วในบริษัท GL - จีลิงค์", fieldErrors: { code: "duplicate" },
  })
  assert.equal(read("src/app/api/branches/[id]/route.ts").match(/fieldErrors: \{ code: "duplicate" \}/g)?.length, 1)

  const employee = await load<Update>("src/app/api/employees/[id]/route.ts")
  stubDb({ employee: { findFirst: () => ({ id: "emp-1", isActive: true }) } })
  await expectBody(await employee.PUT(jsonRequest("PUT", {
    code: "E1", fullNameTh: "สมชาย", fullNameEn: "", email: "", companyId: "c1", branchId: "b1", departmentId: "d1", position: "", employmentStatus: "active", managerId: "emp-1", isActive: true,
  }), params("emp-1")), 400, { error: "Employee cannot be their own manager", fieldErrors: { managerId: "employeeOwnManager" } })

  const location = await load<Update>("src/app/api/locations/[id]/route.ts")
  const place = { code: "L1", name: "Store", branchId: "b1", parentId: "loc-1", locationType: "Room", description: "", isActive: true }
  stubDb({})
  await expectBody(await location.PUT(jsonRequest("PUT", place), params("loc-1")), 400, { error: "Location cannot be its own parent", fieldErrors: { parentId: "locationOwnParent" } })
  stubDb({ location: { findFirst: () => ({ id: "loc-1", isActive: true }), findMany: () => [{ id: "loc-1", parentId: null }, { id: "loc-2", parentId: "loc-1" }] } })
  await expectBody(await location.PUT(jsonRequest("PUT", { ...place, parentId: "loc-2" }), params("loc-1")), 400, { error: "Location hierarchy cannot contain a cycle", fieldErrors: { parentId: "locationCycle" } })
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-s.test.ts`. Expected to fail: "admin and master-data refusals about one field name it: username, password, role name, permissions, branch code, manager, parent (V spec §6.2)" (the first body has no `fieldErrors`).
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin edits:** none (`tests/admin-user-routes.test.ts` and `tests/admin-role-routes.test.ts` stay green unchanged; they assert statuses and fields these edits keep).
- [ ] **Step 5: Verify.** `node --test tests/v-track-s.test.ts tests/admin-user-routes.test.ts tests/admin-role-routes.test.ts tests/api-error-catalog.test.ts`; `npm test` (2231 tests, 2230 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npx eslint tests/v-track-s.test.ts src/app/api`. `grep -c "field-error-response" "src/app/api/employees/[id]/route.ts" "src/app/api/locations/[id]/route.ts"` prints `1` for each.
- [ ] **Step 6: Commit.** `git add src/app/api/admin/users src/app/api/admin/roles src/app/api/branches "src/app/api/employees/[id]/route.ts" "src/app/api/locations/[id]/route.ts" tests/v-track-s.test.ts`, then `git commit -m "feat(api): admin and master-data refusals about one field name it (v-track plan 1 task 9, S9)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 10 (S10): Asset, operation, maintenance and import refusals about a field name it (9 routes)

Spec §6.2 (serial number exists, purchase document number exists, the checkout condition error, the status-correction status error, PM vendor not found or inactive, invalid assignee, the import file rules (form-level)); S-R6, S-R7, S-R9.

**Files:**
- Modify (CRLF): `src/app/api/assets/[id]/route.ts`, `src/app/api/assets/[id]/checkout/route.ts`, `src/app/api/maintenance-plans/route.ts`; (LF): `src/app/api/assets/route.ts`, `src/app/api/purchase-documents/route.ts`, `src/app/api/assets/[id]/status-correction/route.ts`, `src/app/api/notifications/route.ts`, `src/app/api/assets/import-preview/route.ts`, `src/app/api/assets/import-confirm/route.ts`
- Test: `tests/v-track-s.test.ts` (LF)

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `assets/route.ts:5`, `assets/[id]/route.ts:6` | `import { errorResponse } from "@/lib/api-response"` | it, then `import { FieldRefusalError } from "@/lib/field-errors"` | — |
| `assets/route.ts:142`, `assets/[id]/route.ts:167` | `    throw new Error("Serial Number already exists")` | `    throw new FieldRefusalError("Serial Number already exists", { serialNumber: "duplicate" })` | S-R6 |
| `purchase-documents/route.ts:64` | `      return NextResponse.json({ error: "Purchase document already exists", id: existing.id }, { status: 409 })` | `      return NextResponse.json(` / `        { error: "Purchase document already exists", id: existing.id, code: "DUPLICATE", fieldErrors: { documentNo: "duplicate" } },` / `        { status: 409 },` / `      )` | S-R9 |
| `assets/[id]/checkout/route.ts:60` | `      return NextResponse.json({ code: conditionError, error: "Invalid asset condition for checkout" }, { status: 400 })` | `      return NextResponse.json(` / `        { code: conditionError, error: "Invalid asset condition for checkout", fieldErrors: { conditionBefore: "invalidCheckoutCondition" } },` / `        { status: 400 },` / `      )` | S-R7 |
| `assets/[id]/status-correction/route.ts:2` | `import { errorResponse } from "@/lib/api-response"` | it, then `import { getApiErrorKey } from "@/lib/api-error-catalog"` and `import { fieldErrorResponse } from "@/lib/field-error-response"` | — |
| `assets/[id]/status-correction/route.ts:33` | `    if (statusError) return NextResponse.json({ error: statusError }, { status: 400 })` | `    if (statusError) {` / `      return fieldErrorResponse({ status: 400, error: statusError, fieldErrors: { nextStatusId: getApiErrorKey(statusError) ?? "invalid" } })` / `    }` | S-R7 (both messages of `getAssetStatusCorrectionError` are in the catalog) |
| `maintenance-plans/route.ts:4`, `notifications/route.ts:3`, `assets/import-preview/route.ts:3`, `assets/import-confirm/route.ts:4` | `import { errorResponse } from "@/lib/api-response"` | it, then `import { fieldErrorResponse } from "@/lib/field-error-response"` | — |
| `maintenance-plans/route.ts:54` | `      if (!vendor) return NextResponse.json({ error: "PM vendor not found or inactive" }, { status: 400 })` | `      if (!vendor) return fieldErrorResponse({ status: 400, error: "PM vendor not found or inactive", fieldErrors: { vendorId: "pmVendorNotFound" } })` | S-R7 |
| `notifications/route.ts:44` | `      if (!assignee) return NextResponse.json({ error: "Invalid assignee" }, { status: 400 })` | `      if (!assignee) return fieldErrorResponse({ status: 400, error: "Invalid assignee", fieldErrors: { assignedToUserId: "invalidAssignee" } })` | S-R7 |
| `assets/import-preview/route.ts:17-25`, `assets/import-confirm/route.ts:27-35` | the three `return NextResponse.json({ error: "<Thai rule>" }, { status: 400 })` of `if (!(file instanceof File))`, `if (file.size > maxImportSize)`, `if (!file.name.toLowerCase().endsWith(".xlsx"))` | above the first `if`: `    // The file rules belong to the upload as a whole, so they go under _form (V track spec §6.2).`; each return becomes `return fieldErrorResponse({ status: 400, error: "<the same Thai rule>", fieldErrors: { _form: "<code>" } })` with codes `required`, `outOfRange`, `invalidFormat` in that order | S-R7 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-s.test.ts`:

```ts

test("asset, operation, maintenance and import refusals about a field name it; the import file rules belong to the form (V spec §6.2)", async () => {
  type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>
  const params = { params: Promise.resolve({ id: "asset-1" }) }
  const expectBody = async (response: Response, status: number, body: unknown) => {
    assert.equal(response.status, status)
    assert.deepEqual(await response.json(), body)
  }

  // Serial numbers are checked in a helper that throws; both asset routes throw the field refusal.
  for (const path of ["src/app/api/assets/route.ts", "src/app/api/assets/[id]/route.ts"]) {
    const source = read(path)
    assert.ok(source.includes(`throw new FieldRefusalError("Serial Number already exists", { serialNumber: "duplicate" })`), path)
    assert.ok(!source.includes(`throw new Error("Serial Number already exists")`), path)
  }

  const purchaseDocuments = await load<{ POST: Handler }>("src/app/api/purchase-documents/route.ts")
  stubDb({ purchaseDocument: { findFirst: () => ({ id: "pd-1" }) } })
  await expectBody(await purchaseDocuments.POST(jsonRequest("POST", { documentType: "invoice", documentNo: "INV-1", documentDate: "", totalAmount: "" }), params), 409, {
    error: "Purchase document already exists", id: "pd-1", code: "DUPLICATE", fieldErrors: { documentNo: "duplicate" },
  })

  const checkout = await load<{ POST: Handler }>("src/app/api/assets/[id]/checkout/route.ts")
  stubDb({
    asset: { findFirst: () => ({ id: "asset-1", status: { name: "Ready", nameTh: "พร้อมใช้" } }) },
    assetCheckout: { findFirst: () => null },
    assetCondition: { findUnique: () => null },
  })
  await expectBody(await checkout.POST(jsonRequest("POST", {
    handoverMode: "permanent_assignment", checkoutType: "user", custodianId: "employee-1", departmentId: "", locationId: "", parentAssetId: "",
    checkoutDate: "2026-10-17", expectedReturnDate: "", conditionBefore: "condition-gone", remark: "", receiverSignature: "",
  }), params), 400, { error: "Invalid asset condition for checkout", code: "ASSET_STATE_MASTER_NOT_FOUND", fieldErrors: { conditionBefore: "invalidCheckoutCondition" } })

  const correction = await load<{ POST: Handler }>("src/app/api/assets/[id]/status-correction/route.ts")
  stubDb({
    asset: { findFirst: () => ({ id: "asset-1", status: { id: "s-ready", name: "Ready", nameTh: "พร้อมใช้" } }) },
    assetStatus: { findFirst: () => ({ id: "s-ready", name: "Ready", nameTh: "พร้อมใช้" }) },
  })
  await expectBody(await correction.POST(jsonRequest("POST", { nextStatusId: "s-ready", reason: "counted twice" }), params), 400, {
    error: "This asset status does not require controlled correction", fieldErrors: { nextStatusId: "statusCorrectionNotNeeded" },
  })

  const plans = await load<{ POST: Handler }>("src/app/api/maintenance-plans/route.ts")
  stubDb({ asset: { findFirst: () => ({ id: "asset-1" }) }, supplier: { findFirst: () => null } })
  await expectBody(await plans.POST(jsonRequest("POST", { assetId: "asset-1", title: "PM", frequency: "monthly", intervalDays: "", nextDueDate: "2026-11-01", vendorId: "vendor-x", notes: "" }), params), 400, {
    error: "PM vendor not found or inactive", fieldErrors: { vendorId: "pmVendorNotFound" },
  })

  const notifications = await load<{ PATCH: Handler }>("src/app/api/notifications/route.ts")
  stubDb({ user: { findFirst: () => null } })
  await expectBody(await notifications.PATCH(jsonRequest("PATCH", { key: "overdue:asset-1", action: "assign", count: 1, assignedToUserId: "user-x" }), params), 400, {
    error: "Invalid assignee", fieldErrors: { assignedToUserId: "invalidAssignee" },
  })

  // The import file rules are about the upload, not a field: they go under _form, and the form keeps its own message.
  for (const path of ["src/app/api/assets/import-preview/route.ts", "src/app/api/assets/import-confirm/route.ts"]) {
    const { POST } = await load<{ POST: Handler }>(path)
    stubDb({})
    const upload = (file?: File) => {
      const form = new FormData()
      if (file) form.append("file", file)
      return POST(new Request("http://localhost/api/test", { method: "POST", body: form }), params)
    }
    await expectBody(await upload(), 400, { error: "กรุณาเลือกไฟล์ Excel", fieldErrors: { _form: "required" } })
    await expectBody(await upload(new File([new Uint8Array(10 * 1024 * 1024 + 1)], "assets.xlsx")), 400, { error: "ไฟล์ต้องมีขนาดไม่เกิน 10 MB", fieldErrors: { _form: "outOfRange" } })
    await expectBody(await upload(new File(["a,b"], "assets.csv")), 400, { error: "รองรับเฉพาะไฟล์ .xlsx", fieldErrors: { _form: "invalidFormat" } })
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-s.test.ts`. Expected to fail: "asset, operation, maintenance and import refusals about a field name it; the import file rules belong to the form (V spec §6.2)" (the first assertion names `src/app/api/assets/route.ts`).
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin edits:** none (`tests/asset-operation-status-policy.test.ts`, `tests/upload-validation.test.ts`, `tests/asset-import-field-labels.test.ts`, `tests/pm-plans-ui.test.ts` stay green unchanged).
- [ ] **Step 5: Verify.** `node --test tests/v-track-s.test.ts`; `npm test` (2232 tests, 2231 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npm run lint` (0 errors, 146 warnings, all under `.agents/`, the baseline). `tests/v-track-s.test.ts` is 481 LF lines.
- [ ] **Step 6: Commit.** `git add src/app/api/assets src/app/api/purchase-documents/route.ts src/app/api/maintenance-plans/route.ts src/app/api/notifications/route.ts tests/v-track-s.test.ts`, then `git commit -m "feat(api): asset, operation, maintenance and import refusals about a field name it (v-track plan 1 task 10, S10)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Rehearsal (area S)

Scratch clone `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/v-plan/sim-S`, cloned from `v-sim` at `71e5251` (tag `s-base`, branch `simS`), `core.autocrlf=true` (a CRLF working tree everywhere, unlike the real checkout's LF files), `node_modules` a full copy of `v-sim`'s (not the real repo's, no junction). Baseline there: `npm test` 2226 tests, 2225 pass, 0 fail, 1 skipped; `tsc` clean. Exact-string edits went through a small replace script that keeps each file's line endings (every edited file stayed CRLF there; the new files are LF). The plan's dry run ran in a clone whose line endings match the real checkout's (Global Constraints).

| Task | Sim commit | Failed first with | After the commit |
|---|---|---|---|
| S1 | `a93e991f` | the file: `ERR_MODULE_NOT_FOUND` for `src/lib/field-errors.ts` | `npm test` 2227 / 2226 / 0 / 1; tsc clean; eslint clean |
| S2 | `daa63160` | the file: `SyntaxError … does not provide an export named 'FieldRefusalError'`; with the code in place and no pin edit, "a ZodError reaches the browser as one fixed message, …" (`tests/api-error-exposure.test.ts`) | 2228 / 2227 / 0 / 1; tsc, eslint clean |
| S3 | `da9f5447` | "the disposal recipient rule has its catalog key, …" | 2229 / 2228 / 0 / 1; messages 4068 |
| S4 | `486169ae` | "the settings route keys each setting's error by the setting, …" | 2230 / 2229 / 0 / 1 |
| S5 | `1936f1d9` | "the asset batch names the row or the common field that failed, …" (`TypeError: assetBatchItemIssuePath is not a function`) | 2231 / 2230 / 0 / 1 |
| S6 | `b11a17c4` | "checkout's HANDOVER_* refusal and disposal execution's evidence refusal …" | 2232 / 2231 / 0 / 1 |
| S7 | `e66fd7e7` | "supplier answers with the shared body and codes: …" | 2229 / 2228 / 0 / 1 (−4 deleted, +1); messages 4067 |
| S8 | `9e06af82` | "a duplicate code or name in master data answers 409 under its field, …" | 2230 / 2229 / 0 / 1; messages 4074 |
| S9 | `718827f4` | "admin and master-data refusals about one field name it: …" | 2231 / 2230 / 0 / 1 |
| S10 | `9e444fd0` | "asset, operation, maintenance and import refusals about a field name it; …" | 2232 / 2231 / 0 / 1; full `npm run lint` 0 errors, 146 warnings (baseline) |

A route-loading probe before S2 imported all 34 route modules area S touches through the hook; all loaded except `src/app/api/disposal-requests/[id]/route.ts` (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`, a parameter property in a service it imports), which is why S6 reads that route as source.

What the rehearsal changed in this plan text:
- S1: zod 4 issues carry no `input` and say "received undefined" only in the message; `received` is set only for `NaN` / `Invalid Date`. `IssueLike` gains `received?` (S-R1) and a missing number is `required`, a `NaN` `invalidNumber`.
- S2: `FieldRefusalError` declares its fields in the class body: written with constructor parameter properties, tests that import `field-errors.ts` would fail under node's strip-only mode (seen on the disposal route's service).
- S3: the first draft of the disposal check left out the optional keys; zod 4 then reports `nonoptional` (`required`) for the preprocess fields instead of the custom rules. The test sends every key, as the form does.
- S4–S7 ran with the helper named `useDb`; S8's loop made eslint report `react-hooks/rules-of-hooks` (1 error), so the helper became `stubDb` in S8's commit. This plan uses `stubDb` from S4 on (a rename only; the rehearsal's S4–S7 results do not depend on the name).
- S5: the duplicate helper's rows are `Pick<AssetBatchRowInput, "serialNumber" | "assetTag">`; with `clientId` in the test's rows `tsc` failed (excess property), so the test passes rows without it.
- S9: a plain "add the import below `errorResponse`" put a second `@/lib/field-error-response` import into `employees/[id]` and `locations/[id]` (S8 already imports it); S9 now widens S8's line there.
- S10: the serial-number source checks use `assert.ok(source.includes(…), path)`; `assert.match` printed the whole route source on failure.

---

## Area F: the shared foundation, the messages, the hook, the shared parts and the V guards (Tasks 11–18, F1–F8)

Spec `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` §4.1–§4.5, §7.1–§7.3, §8 (guards), §10 (left to the builder), U1, U2, U6, U7, U8. Area F runs **after area S**: it imports S's `FORM_ERROR_KEY` and `FieldErrorCode` from `src/lib/field-errors.ts` (FIXED 1) and reads `payload.fieldErrors` in the shape S's bodies send (FIXED 2). It changes no route and no form's behaviour: the forms move in area M. Every site below is found by its quoted text, not by its line number.

**Tests:** one new LF file `tests/v-track-f.test.ts`, one test per task for F1–F7, appended in order (7 tests); Task F8 creates the guard file `tests/validation-guards.test.ts` (6 tests, FIXED 7) and its reader `tests/helpers/validation-reader.ts`. Pins in other test files are edited in the task that changes what they pin (F5, F6). **Messages:** 17 new keys under `common.validation` (F2), nothing deleted. **No Next.js API** is used by this area (React 19 hooks, next-intl 4 `useTranslations` and `t.has`, declared at `node_modules/use-intl/dist/types/core/createTranslator.d.ts:41`).

### Inventory (F at `71e5251`)

| Where | What is there | Task |
|---|---|---|
| `src/components/ui/field.tsx:19`, `:32` | `error?: React.ReactNode`; `function Field({ label, hideLabel, required, hint, error, id, className, labelAction, children }: FieldProps) {` | F5 |
| `src/components/ui/field.tsx:68` | `{error ? <FieldError id={errorId}>{error}</FieldError> : null}` (hint first, then error) | F5 |
| `src/components/ui/field.tsx:100` | `FieldError` is `<p data-slot="field-error" role="alert" …>`: N wrong fields after one submit are N alerts (anti-goal, spec §3) | F5 |
| `src/components/ui/field.tsx:5-12` | Field hands `id`, `aria-describedby` (error before hint), `aria-invalid`, `aria-required` to its control; never native `required` | F3 reads `${id}-error` |
| `src/components/ui/field-variants.ts:15-16` | `aria-invalid:border-danger … shadow-field-error` and `aria-invalid:focus:border-ring … shadow-field-focus` (the teal-on-focus row); `:36` `export const textareaClasses` | F6 anchor |
| `src/components/ui/searchable-select.tsx:6` | `import { fieldControlVariants, type FieldSize } from "@/components/ui/field-variants"` | F6 |
| `src/components/ui/searchable-select.tsx:48` | `const triggerId = id ?? \`${generatedId}-trigger\``: a caller's `id` is the trigger's id (the stable id focus needs) | F6 (stays) |
| `src/components/ui/searchable-select.tsx:88`, `:92` | `disabled={disabled}`; `error ? "border-danger ring-1 ring-danger shadow-field-error" : undefined,`: a fixed class, so a focused or open trigger in error stays red (DESIGN.md:474 wants teal) | F6 |
| `src/components/ui/searchable-select.tsx:139` | `{error ? <FieldError id={errorId}>{error}</FieldError> : null}`; describedby error then hint (`:53`) | F5 (follows), F6 |
| `src/components/maintenance/maintenance-option-select.tsx:11`, `:22`, `:36`, `:84`, `:93` | props start `type,`; `hint,`; `hint?: React.ReactNode`; `<SearchableSelect` with `hint={hint}`: no `id`, no `error` forwarded | F6 |
| `src/components/audit/audit-scan-check-field.tsx:7`, `:15`, `:26`, `:39`, `:48` | props start `label,`; `labelFor,`; `labelFor: (id: string) => string`; `<SearchableSelect` with `clearLabel={t("clearValue")}`: no `id`, no `error` | F6 |
| `src/components/assets/asset-form.tsx:844`, `:896` | the two live duplicate errors (`duplicateAssetTag`, `duplicateSerialNumber`), today announced by FieldError's alert role | F5 |
| `src/components/admin/IntegrationClientManager.tsx:419-420`, `:472-473` | `<fieldset className="min-w-0">` + `<legend className={cn(fieldLabelClasses, "mb-1.5")}>`: the group markup FieldGroup takes over (area M) | F7 |
| `src/components/ui/choice-card.tsx:20-23` | ChoiceCard and ChoiceChip have no invalid style (stays, F-R8) | — |
| `src/components/ui/segmented.tsx:46` | `role="group"` of `aria-pressed` buttons, always one value (stays, F-R8) | — |
| `src/components/layout/dashboard-shell.tsx:124` | `<main ref={mainRef} data-dashboard-main className="… overflow-y-auto …">`, the scroll area; the topbar sits above it; `:60` `anchorOffset = 96` for hash anchors | F3 |
| `src/components/ui/sticky-form-footer.tsx:21`, `:23` | `data-slot="sticky-form-footer"`, `sticky -bottom-4 z-10 …`: a field that focus scrolls "into view" can sit under it | F3 |
| `src/lib/api-error-catalog.ts:263` | `export function getApiErrorKey(raw: string): string \| null`; the catalog keys are `apiErrors.<key>` messages | F2 (resolver reads `apiErrors`) |
| `src/components/ui/use-api-error.ts:9-25` | only `describe` and `toast`; no field-error hook exists anywhere in `src` | F4 |
| `messages/*.json` | 4067 keys at `71e5251`; `common` has 62 keys, no `common.validation`; `common.required` "กรุณากรอกข้อมูล" (`th.json:31`, stays); `apiErrors.endBeforeStart` "วันสิ้นสุดต้องอยู่หลังวันเริ่มต้น" (stays) | F2 |
| `tests/field-primitives.test.ts:88`, `:115-116`, `:168` | pins `role="alert"`, the SearchableSelect fixed error class, the Field signature | F5, F6 |
| `tests/asset-forms-ui.test.ts:25-26` | pins the two duplicate `<Field … error={…}>` strings | F5 |
| `tests/supplier-form-ui.test.ts:18` | a comment that says FieldError has `role="alert"` | F5 |
| `tests/form-migration-guards.test.ts:53` | FMG `STAR_ONLY` (checkin return date, asset-form license seats and component role): all three are forms of later plans; area F does not touch it (F-R10) | — |
| `src` `<form>` elements | 39 non-search `<form>` elements in 36 files: 37 in 34 files of the scope list, plus the login form and `ui/confirm-text-dialog.tsx` (two JSX comments, `admin-user-form.tsx:124` and `asset-model-form.tsx:234`, name `<form>` and are not forms); the other 12 forms of the 51 submit from a button; 14 required `SearchableSelect`/`MaintenanceOptionSelect`/`AuditScanCheckField` call sites with no `error=` in 10 form files, none of them in a plan-1 form (the reader also counts the two wrappers' own `<SearchableSelect required={required}>` until Task 16 passes `error` on: 16 in 12 at `71e5251`) | F8 |
| `src` toasts outside a catch | 62 `toast.error`/`toast.warning` outside a catch in 20 files (the reader of F8): the spec's 38 validation toasts, the supplier server toast (`supplier-form.tsx:133`), the batch duplicate-check result (`asset-batch-form.tsx:522`), and non-validation ones (upload results, camera and torch, `componentOutOfRound`, notification actions, `use-api-error.ts:21`) | F8 (F-R9) |

### Interfaces this area consumes

| From | What F relies on |
|---|---|
| Area S (FIXED 1) | `src/lib/field-errors.ts` exports `FORM_ERROR_KEY = "_form"` and `type FieldErrorCode` (the 11 codes), importable with a relative `./field-errors.ts` import (no `@/`). F imports only these two. |
| Area S (FIXED 2) | a refusal body carries `fieldErrors: Record<string, string>` (dotted keys, `_form`, a code or a catalog key per key). F reads nothing else of the body. |

### Interfaces this area makes (for area M and later plans)

| Made in | What | Used by |
|---|---|---|
| F1 | `src/lib/validation-rules.ts`: `required`, `minLength`, `maxLength`, `range`, `email`, `pattern`, `notBefore`, `atLeastOne` (FIXED 4), each `→ RuleCode \| null`, `export type RuleCode = FieldErrorCode \| "endBeforeStart"`; chain with `??` (`required(v) ?? maxLength(v, 100)`) | every form's `validate()` |
| F2 | `common.validation.*` (17 keys, F-R2); `src/lib/field-error-client.ts`: `type ValidationParams`, `type MessageLookup`, `validationMessageKey(code, params?)`, `resolveValidationMessage(code, params, lookups)` | F4; a form that shows a code outside a Field |
| F3 | `src/lib/field-focus.ts`: `FIELD_FOCUS_MARGIN = 24`, `type FieldScrollBox`, `fieldScrollTop(box)`, `focusField(target): HTMLElement \| null`, `waitForElement(id, frames = 30)` | F4; a form that must focus without the hook |
| F4 | `src/components/ui/use-field-errors.ts` (`"use client"`): `useFieldErrors<K>(options?: { params?: Partial<Record<K, ValidationParams>> })` → `{ errors, setErrors, applyServer, clear, message, focusFirst }`, `useValidationMessage()`, `type FieldErrorMap<K>`; `field-error-client.ts` gains `readFieldErrors(payload)`, `firstErrorKey(errors, order)`, `withoutKeys(errors, keys)` (F-R4) | every form task |
| F5 | `Field liveError` (boolean): the polite path for errors shown while typing (U8); `FieldError` has no role | asset form (now), settings `ValidationMessage` moves, prefix editor, batch duplicates (later plans) |
| F6 | `triggerInvalidClasses` (`field-variants.ts`); `SearchableSelect` sets `data-invalid` from `error`; `MaintenanceOptionSelect` and `AuditScanCheckField` take `id?` and `error?` | every required select |
| F7 | `src/components/ui/field-group.tsx`: `FieldGroup({ legend, required, hint, error, id, className, children })`, `<fieldset id data-slot="field-group">`, error id `${id}-error` | integration scopes (Task 27, M9, A-R3); handover mode, repair outcome (later plans) |
| F8 | `tests/validation-guards.test.ts`: `V_SCOPE` (51 forms, 44 files), `NOT_IN_SCOPE` (2), `V_FORMS` (empty), `SELECT_STAR_ONLY` (14 in 10 files), rules V1–V5; `tests/helpers/validation-reader.ts`: `withoutBlockComments`, `catchRanges`, `linesOutsideCatch` | each form task adds its file to `V_FORMS` (and drops its `SELECT_STAR_ONLY` row) in the commit that moves it |

**How a form task uses F** (the hook's contract, FIXED 3 as amended by F-R4; an illustration of the calls only: area M's forms name their keys and ids in a `FIELD_IDS` table, M-R1, and call `useFieldErrors<K>()` without `params`, A-R2, so supplier's `contactPerson` keeps the id `supplier-contact`):
```tsx
const ORDER = ["code", "name", "email"] as const                 // the form's visual order
type Key = (typeof ORDER)[number]
const fieldErrors = useFieldErrors<Key>({ params: { name: { max: 200 } } })
const idFor = (key: Key) => `supplier-${key}`
function validate(values: Values): Partial<Record<Key, string>> { /* required(values.code) ?? maxLength(values.code, 50) … */ }
// submit:  fieldErrors.setErrors(validate(values)); if (fieldErrors.focusFirst(ORDER, { idFor })) return
// refused: if (fieldErrors.applyServer(payload) && fieldErrors.focusFirst(ORDER, { idFor })) return; otherwise throw as today,
//          so the catch shows today's form-level message (apiErrors.validationFailed by toast or the dialog Notice)
// change:  fieldErrors.clear("code") in the field's onChange (a pair or a group clears all of its keys)
// render:  <Field label={t("code")} id="supplier-code" required error={fieldErrors.message("code")}>
```

---

### Task 11 (F1): Rule helpers that return codes for every form's validate() (`src/lib/validation-rules.ts`)

Spec §4.5, §7.2; FIXED 4; F-R1.

**Files:**
- Create: `src/lib/validation-rules.ts` (LF, new)
- Create: `tests/v-track-f.test.ts` (LF, new; F2–F7 append to it)

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| new file `src/lib/validation-rules.ts` | — | a header comment (what the helpers are for, that `noValidate` leaves these rules to them, that tests import the file), `import type { FieldErrorCode } from "./field-errors.ts"`, `export type RuleCode = FieldErrorCode \| "endBeforeStart"`, and the eight helpers of FIXED 4, each `→ RuleCode \| null`, behaving as F-R1 says and as Step 1 fixes. No other import; no `"use client"`, `react`, `zod` or `@/` anywhere, comments included. | F-R1 |

Signatures (exact): `required(value: unknown)`, `minLength(value: string | null | undefined, min: number)`, `maxLength(value: string | null | undefined, max: number)`, `range(value: number | string | null | undefined, min?: number | null, max?: number | null)`, `email(value: string | null | undefined)`, `pattern(value: string | null | undefined, expression: RegExp)`, `notBefore(end: string | null | undefined, start: string | null | undefined)`, `atLeastOne(values: readonly unknown[])`. The email pattern is the WHATWG one: ``/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/`` (write it with a file tool). `pattern` anchors with `new RegExp(\`^(?:${expression.source})$\`, expression.flags.replace(/[gy]/g, ""))`.

- [ ] **Step 1: The failing test.** Create `tests/v-track-f.test.ts` (LF) with exactly:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { atLeastOne, email, maxLength, minLength, notBefore, pattern, range, required } from "../src/lib/validation-rules.ts"

// V track plan 1, area F (spec docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4, §7): the rule helpers,
// the messages, the field-error hook, the focus helper and the shared parts. One test per commit. Sources are read with
// LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the rule helpers return codes, not text, and restate what the browser checked before noValidate (V spec §4.5, §7.2)", () => {
  // required: empty, blank, an empty list and an unticked box are missing; 0 is a value.
  for (const value of [undefined, null, "", "   ", [], false]) assert.equal(required(value), "required", JSON.stringify(value))
  for (const value of ["a", " a ", 0, ["x"], true]) assert.equal(required(value), null, JSON.stringify(value))
  // Length rules leave an empty value to required. minLength counts the trimmed text (the old disabled gates did);
  // maxLength counts the text as typed, like the maxLength attribute.
  assert.equal(minLength("", 10), null)
  assert.equal(minLength("  short   ", 10), "tooShort")
  assert.equal(minLength("ten chars!", 10), null)
  assert.equal(maxLength("", 3), null)
  assert.equal(maxLength("abcd", 3), "tooLong")
  assert.equal(maxLength("abc", 3), null)
  assert.equal(maxLength("กขค", 3), null, "Thai letters count one each, as the attribute counts them")
  // range: numbers or typed text; text that is not a number is invalidNumber; either bound may be left out.
  assert.equal(range("", 1, 100), null)
  assert.equal(range(null, 1, 100), null)
  assert.equal(range("abc", 1, 100), "invalidNumber")
  assert.equal(range("0", 1, 100), "outOfRange")
  assert.equal(range(101, 1, 100), "outOfRange")
  assert.equal(range(" 50 ", 1, 100), null)
  assert.equal(range(-1, 0, undefined), "outOfRange")
  assert.equal(range(1e9, 0, undefined), null)
  assert.equal(range(7, undefined, 5), "outOfRange")
  // email: the browser's own type="email" rule (WHATWG), so nothing it accepted before is refused now.
  assert.equal(email(""), null)
  assert.equal(email("buyer@example.co.th"), null)
  for (const value of ["buyer", "buyer@", "@example.com", "buyer @example.com", "buyer@exa mple.com"]) assert.equal(email(value), "invalidEmail", value)
  // pattern: the whole value must match, like the pattern attribute.
  const roleName = /[a-z][a-z0-9_]*/
  assert.equal(pattern("", roleName), null)
  assert.equal(pattern("asset_admin", roleName), null)
  assert.equal(pattern("Asset_admin", roleName), "invalidFormat")
  assert.equal(pattern("asset admin", roleName), "invalidFormat", "a match inside the value is not enough")
  // notBefore: end before start is the catalog key; the same day is fine; an empty side is left to required.
  assert.equal(notBefore("2026-10-16", "2026-10-17"), "endBeforeStart")
  assert.equal(notBefore("2026-10-17", "2026-10-17"), null)
  assert.equal(notBefore("2026-10-18", "2026-10-17"), null)
  assert.equal(notBefore("", "2026-10-17"), null)
  assert.equal(notBefore("2026-10-16", ""), null)
  // atLeastOne: a group (scopes, destinations) needs one value that required accepts.
  assert.equal(atLeastOne([]), "required")
  assert.equal(atLeastOne(["", null, false]), "required")
  assert.equal(atLeastOne(["", "integration:read"]), null)
  // Pure and importable by tests and client code: no React, no zod, no "@/".
  assert.doesNotMatch(read("src/lib/validation-rules.ts"), /from "@\/|from "zod"|from "react"|"use client"/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-f.test.ts`. Expected to fail: the file itself, `ERR_MODULE_NOT_FOUND` for `src/lib/validation-rules.ts` (no test runs). If the error names `src/lib/field-errors.ts` instead, area S's module is missing: stop and report.
- [ ] **Step 3: Implement** `src/lib/validation-rules.ts` as above (about 65 lines).
- [ ] **Step 4: Pin edits:** none.
- [ ] **Step 5: Verify.** `node --test tests/v-track-f.test.ts`; `npm test` (2233 tests, 2232 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`). `node <tools>/eol.mjs src/lib/validation-rules.ts tests/v-track-f.test.ts` prints `0` and its line count (65 in the rehearsal), and `0 56`.
- [ ] **Step 6: Commit.** `git add src/lib/validation-rules.ts tests/v-track-f.test.ts` (the LF warnings are expected), then `git commit -m "feat(forms): rule helpers that return field-error codes for every form's validate() (v-track plan 1 task 11, F1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 12 (F2): The common.validation messages and one resolver from code to text (`messages/*.json`, `src/lib/field-error-client.ts`)

Spec §6.1 (codes), §7.1; FIXED 5; F-R2, F-R3.

**Files:**
- Modify: `messages/th.json`, `messages/en.json` (`i/lf w/crlf`; only through `scripts/messages-edit.mjs`)
- Create: `src/lib/field-error-client.ts` (LF, new; F4 appends to it)
- Test: `tests/v-track-f.test.ts` (LF)

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `messages/*.json` `common` | no `validation` object | `common.validation` with the 17 keys of the change file below, th and en | F-R2 |
| new file `src/lib/field-error-client.ts` | — | a header comment (the pure half of the field-error hook; tests import it; no React, next-intl or `@/`), `export type ValidationParams = Readonly<Record<string, string \| number>>`, `export type MessageLookup = { has: (key: string) => boolean; get: (key: string, params?: ValidationParams) => string }`, `export function validationMessageKey(code: string, params?: ValidationParams): string`, `export function resolveValidationMessage(code: string, params: ValidationParams \| undefined, lookups: { validation: MessageLookup; apiErrors: MessageLookup }): string`, behaving as F-R3 says. A param counts when it is neither `undefined` nor `""`. | F-R3 |

Change file `<temp>/v-f2-messages.json` (exact):

```json
{
  "set": {
    "th": {
      "common.validation.required": "กรุณาระบุข้อมูลนี้",
      "common.validation.tooShort": "ต้องมีอย่างน้อย {min} ตัวอักษร",
      "common.validation.tooShortPlain": "ข้อมูลสั้นเกินไป",
      "common.validation.tooLong": "ต้องไม่เกิน {max} ตัวอักษร",
      "common.validation.tooLongPlain": "ข้อมูลยาวเกินกำหนด",
      "common.validation.outOfRange": "ต้องอยู่ระหว่าง {min} ถึง {max}",
      "common.validation.outOfRangeMin": "ต้องไม่น้อยกว่า {min}",
      "common.validation.outOfRangeMax": "ต้องไม่เกิน {max}",
      "common.validation.outOfRangePlain": "ค่าอยู่นอกช่วงที่กำหนด",
      "common.validation.invalidDate": "วันที่ไม่ถูกต้อง",
      "common.validation.invalidNumber": "กรุณากรอกเป็นตัวเลข",
      "common.validation.invalidEmail": "รูปแบบอีเมลไม่ถูกต้อง",
      "common.validation.invalidFormat": "รูปแบบไม่ถูกต้อง",
      "common.validation.invalidChoice": "กรุณาเลือกจากรายการ",
      "common.validation.duplicate": "ข้อมูลนี้มีอยู่แล้วในระบบ",
      "common.validation.endBeforeStart": "วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น",
      "common.validation.invalid": "ข้อมูลไม่ถูกต้อง"
    },
    "en": {
      "common.validation.required": "This field is required",
      "common.validation.tooShort": "Enter at least {min} characters",
      "common.validation.tooShortPlain": "This value is too short",
      "common.validation.tooLong": "Enter no more than {max} characters",
      "common.validation.tooLongPlain": "This value is too long",
      "common.validation.outOfRange": "Enter a value from {min} to {max}",
      "common.validation.outOfRangeMin": "Enter {min} or more",
      "common.validation.outOfRangeMax": "Enter {max} or less",
      "common.validation.outOfRangePlain": "This value is out of range",
      "common.validation.invalidDate": "Enter a valid date",
      "common.validation.invalidNumber": "Enter a number",
      "common.validation.invalidEmail": "Enter a valid email address",
      "common.validation.invalidFormat": "This value is not in the expected format",
      "common.validation.invalidChoice": "Choose an option from the list",
      "common.validation.duplicate": "This value already exists",
      "common.validation.endBeforeStart": "The end date cannot be before the start date",
      "common.validation.invalid": "This value is not valid"
    }
  }
}
```

- [ ] **Step 1: The failing test.** In `tests/v-track-f.test.ts`, add the line `import { resolveValidationMessage, validationMessageKey, type MessageLookup } from "../src/lib/field-error-client.ts"` directly above the `../src/lib/validation-rules.ts` import, then append:

```ts

test("every code has a Thai and an English message, with its limits when the form gives them (V spec §6.1, §7.1)", () => {
  const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
  const lookup = (table: Record<string, string>): MessageLookup => ({
    has: (key) => typeof table[key] === "string",
    get: (key, params) => table[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name])),
  })
  const th = messages("th")
  const en = messages("en")
  assert.deepEqual(th.common.validation, {
    required: "กรุณาระบุข้อมูลนี้",
    tooShort: "ต้องมีอย่างน้อย {min} ตัวอักษร",
    tooShortPlain: "ข้อมูลสั้นเกินไป",
    tooLong: "ต้องไม่เกิน {max} ตัวอักษร",
    tooLongPlain: "ข้อมูลยาวเกินกำหนด",
    outOfRange: "ต้องอยู่ระหว่าง {min} ถึง {max}",
    outOfRangeMin: "ต้องไม่น้อยกว่า {min}",
    outOfRangeMax: "ต้องไม่เกิน {max}",
    outOfRangePlain: "ค่าอยู่นอกช่วงที่กำหนด",
    invalidDate: "วันที่ไม่ถูกต้อง",
    invalidNumber: "กรุณากรอกเป็นตัวเลข",
    invalidEmail: "รูปแบบอีเมลไม่ถูกต้อง",
    invalidFormat: "รูปแบบไม่ถูกต้อง",
    invalidChoice: "กรุณาเลือกจากรายการ",
    duplicate: "ข้อมูลนี้มีอยู่แล้วในระบบ",
    endBeforeStart: "วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น",
    invalid: "ข้อมูลไม่ถูกต้อง",
  })
  assert.deepEqual(Object.keys(en.common.validation), Object.keys(th.common.validation))
  assert.equal(en.common.validation.tooShort, "Enter at least {min} characters")
  // A code with limits reads them when the form passes them, and a plain sentence when it does not (a server code
  // carries no limits).
  assert.equal(validationMessageKey("tooShort", { min: 10 }), "tooShort")
  assert.equal(validationMessageKey("tooShort"), "tooShortPlain")
  assert.equal(validationMessageKey("tooLong", { max: 100 }), "tooLong")
  assert.equal(validationMessageKey("tooLong", {}), "tooLongPlain")
  assert.equal(validationMessageKey("outOfRange", { min: 1, max: 100 }), "outOfRange")
  assert.equal(validationMessageKey("outOfRange", { min: 0 }), "outOfRangeMin")
  assert.equal(validationMessageKey("outOfRange", { max: 5 }), "outOfRangeMax")
  assert.equal(validationMessageKey("outOfRange"), "outOfRangePlain")
  assert.equal(validationMessageKey("required", { min: 1 }), "required")
  for (const [locale, table] of [["th", th], ["en", en]] as const) {
    const lookups = { validation: lookup(table.common.validation), apiErrors: lookup(table.apiErrors) }
    const say = (code: string, params?: Record<string, string | number>) => resolveValidationMessage(code, params, lookups)
    // Every code of the shared vocabulary (FIXED 1) and the date-pair key resolve to their own sentence, not the generic one.
    for (const code of ["required", "tooShort", "tooLong", "outOfRange", "invalidDate", "invalidNumber", "invalidEmail", "invalidFormat", "invalidChoice", "duplicate", "endBeforeStart"]) {
      assert.notEqual(say(code), table.common.validation.invalid, `${locale}: ${code}`)
    }
    assert.equal(say("invalid"), table.common.validation.invalid)
    // common.validation wins over a catalog key of the same name, then the catalog, then the generic sentence.
    assert.equal(say("endBeforeStart"), table.common.validation.endBeforeStart)
    assert.equal(say("licenseSeatsExceeded"), table.apiErrors.licenseSeatsExceeded, `${locale}: a custom server code reads its catalog message`)
    assert.equal(say("noSuchCode"), table.common.validation.invalid)
  }
  const thLookups = { validation: lookup(th.common.validation), apiErrors: lookup(th.apiErrors) }
  assert.equal(resolveValidationMessage("tooShort", { min: 10 }, thLookups), "ต้องมีอย่างน้อย 10 ตัวอักษร")
  assert.equal(resolveValidationMessage("tooShort", undefined, thLookups), "ข้อมูลสั้นเกินไป")
  assert.equal(resolveValidationMessage("outOfRange", { min: 1, max: 100 }, thLookups), "ต้องอยู่ระหว่าง 1 ถึง 100")
  assert.equal(resolveValidationMessage("outOfRange", { min: 0 }, thLookups), "ต้องไม่น้อยกว่า 0")
  assert.doesNotMatch(read("src/lib/field-error-client.ts"), /from "@\/|"use client"|from "react"|from "next-intl"/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-f.test.ts`. Expected to fail: the file itself, `ERR_MODULE_NOT_FOUND` for `src/lib/field-error-client.ts`. (With the module written and the messages not yet applied, it fails "every code has a Thai and an English message, with its limits when the form gives them (V spec §6.1, §7.1)".)
- [ ] **Step 3: Implement.** Write `src/lib/field-error-client.ts` (about 40 lines); save the change file in `<temp>` and run `node scripts/messages-edit.mjs <temp>/v-f2-messages.json` (it prints `messages updated: 17 th, 17 en, 0 deleted` and keeps CRLF).
- [ ] **Step 4: Pin edits:** none. `tests/thai-glossary.test.ts`, `tests/messages-parity.test.ts` and `tests/messages-edit.test.ts` stay green unchanged.
- [ ] **Step 5: Verify.** `node --test tests/v-track-f.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/messages-edit.test.ts`; `npm test` (2234 tests, 2233 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npm run lint`. Messages: 4091 keys (+17). `node <tools>/eol.mjs messages/th.json messages/en.json src/lib/field-error-client.ts tests/v-track-f.test.ts` prints `4273 4273` for each JSON file, `0 39`, `0 118`.
- [ ] **Step 6: Commit.** `git add messages/th.json messages/en.json src/lib/field-error-client.ts tests/v-track-f.test.ts` then `git commit -m "feat(forms): common.validation messages and one resolver from field-error code to text (v-track plan 1 task 12, F2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 13 (F3): Focus the first wrong field and keep it clear of the top edge and the save bar (`src/lib/field-focus.ts`)

Spec §4.1 (1), §4.2; computed task "a focus/scroll helper that keeps the field clear of the sticky footer and topbar inside `<main data-dashboard-main>`"; F-R5.

**Files:**
- Create: `src/lib/field-focus.ts` (LF, new)
- Test: `tests/v-track-f.test.ts` (LF)

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| new file `src/lib/field-focus.ts` | — | a header comment (why: `main` scrolls, the topbar is above it, the save bar can cover a field; the pure part is for tests); `export const FIELD_FOCUS_MARGIN = 24`; `export type FieldScrollBox = { scrollTop; viewTop; viewBottom; coverBottom; fieldTop; fieldBottom }` (numbers, viewport coordinates); `export function fieldScrollTop(box: FieldScrollBox): number \| null`; the DOM part: `export function focusField(target: HTMLElement): HTMLElement \| null` and `export function waitForElement(id: string, frames = 30): Promise<HTMLElement \| null>` (polls `document.getElementById` once per `requestAnimationFrame`), with private helpers for the control, the closed `<details>` and the field's bounds, as F-R5 says. No import; no `"use client"`, `react`, `@/` or `behavior: "smooth"`. The DOM functions run only in the browser (tests import the file but call only `fieldScrollTop`). | F-R5 |

The selectors and calls Step 1 pins, written exactly so: `closest<HTMLElement>("[data-dashboard-main]")`, `querySelector<HTMLElement>('[data-slot="sticky-form-footer"]')`, ``label[for="${CSS.escape(control.id)}"]`` (inside a template literal), ``getElementById(`${control.id}-error`)``, `node.tagName === "DETAILS"`, `behavior: "auto"`. The wrapper selector is `'[data-slot="field"], [data-slot="field-group"]'`; the control selector is `'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'`, with `'input[type="radio"]:checked:not([disabled])'` tried first inside a group.

- [ ] **Step 1: The failing test.** In `tests/v-track-f.test.ts`, add the line `import { FIELD_FOCUS_MARGIN, fieldScrollTop } from "../src/lib/field-focus.ts"` directly above the `../src/lib/validation-rules.ts` import, then append:

```ts

test("the first wrong field is focused and scrolled clear of the top edge and the sticky save bar (V spec §4.1, §4.2)", () => {
  // The dashboard scroll area runs from 64 to 864 in the viewport; the save bar covers its last 72px.
  const view = { scrollTop: 500, viewTop: 64, viewBottom: 864, coverBottom: 72 }
  assert.equal(FIELD_FOCUS_MARGIN, 24)
  // In view and clear of both edges: no scroll.
  assert.equal(fieldScrollTop({ ...view, fieldTop: 300, fieldBottom: 380 }), null)
  // Above the view: its label lands 24px under the top edge.
  assert.equal(fieldScrollTop({ ...view, fieldTop: 20, fieldBottom: 100 }), 500 + 20 - (64 + 24))
  // Behind the save bar: the least scroll that puts its error line 24px above the bar.
  assert.equal(fieldScrollTop({ ...view, fieldTop: 740, fieldBottom: 820 }), 500 + 820 - (864 - 72 - 24))
  // Below the view: the same.
  assert.equal(fieldScrollTop({ ...view, fieldTop: 1400, fieldBottom: 1480 }), 500 + 1480 - (864 - 72 - 24))
  // Taller than the room left: its top wins, so the label and the start of the control show.
  assert.equal(fieldScrollTop({ ...view, fieldTop: 900, fieldBottom: 1900 }), 500 + 900 - (64 + 24))
  // Never above the start of the page.
  assert.equal(fieldScrollTop({ ...view, scrollTop: 10, fieldTop: 30, fieldBottom: 90 }), 0)
  const focus = read("src/lib/field-focus.ts")
  // The DOM half: the dashboard scroll area, the save bar, the label and the error line count; a closed <details> opens;
  // a group (fieldset) focuses its first control; a dialog or a sheet keeps the browser's own scroll.
  assert.match(focus, /closest<HTMLElement>\("\[data-dashboard-main\]"\)/)
  assert.match(focus, /querySelector<HTMLElement>\('\[data-slot="sticky-form-footer"\]'\)/)
  assert.match(focus, /label\[for="\$\{CSS\.escape\(control\.id\)\}"\]/)
  assert.match(focus, /getElementById\(`\$\{control\.id\}-error`\)/)
  assert.match(focus, /node\.tagName === "DETAILS"/)
  assert.match(focus, /behavior: "auto"/)
  assert.match(focus, /export function focusField\(target: HTMLElement\): HTMLElement \| null/)
  assert.match(focus, /export function waitForElement\(id: string, frames = 30\): Promise<HTMLElement \| null>/)
  assert.doesNotMatch(focus, /from "@\/|"use client"|from "react"|behavior: "smooth"/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-f.test.ts`. Expected to fail: the file itself, `ERR_MODULE_NOT_FOUND` for `src/lib/field-focus.ts`.
- [ ] **Step 3: Implement** `src/lib/field-focus.ts` as above (about 105 lines).
- [ ] **Step 4: Pin edits:** none.
- [ ] **Step 5: Verify.** `node --test tests/v-track-f.test.ts`; `npm test` (2235 tests, 2234 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit` (it checks the DOM types); `npm run lint`. `node <tools>/eol.mjs src/lib/field-focus.ts tests/v-track-f.test.ts` prints `0` and its line count (103 in the rehearsal), and `0 149`.
- [ ] **Step 6: Commit.** `git add src/lib/field-focus.ts tests/v-track-f.test.ts` then `git commit -m "feat(forms): focus the first wrong field and keep it clear of the top edge and the save bar (v-track plan 1 task 13, F3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 14 (F4): One hook holds a form's errors from validate() and the server and focuses the first (`src/components/ui/use-field-errors.ts`)

Spec §4.1, §4.3, §7.2, U6, U7; FIXED 3 as amended by F-R4.

**Files:**
- Create: `src/components/ui/use-field-errors.ts` (LF, new, `"use client"`)
- Modify: `src/lib/field-error-client.ts` (LF; append three helpers)
- Test: `tests/v-track-f.test.ts` (LF)

**Changes (as F2 and F3 left the files):**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| end of `src/lib/field-error-client.ts` | — | `export function readFieldErrors(payload: unknown): Record<string, string> \| null` (the `fieldErrors` object's string entries with a non-empty value; null for anything else or when none is left); `export function firstErrorKey<K extends string>(errors: Partial<Record<string, string>>, order: readonly K[]): K \| null`; `export function withoutKeys<T extends Partial<Record<string, string>>>(errors: T, keys: readonly string[]): T` (the same object when no key is set) | F-R4 |
| new file `src/components/ui/use-field-errors.ts` | — | `"use client"` on line 1; imports `useCallback, useEffect, useMemo, useRef, useState` from `react`, `useTranslations` from `next-intl`, `FORM_ERROR_KEY` from `@/lib/field-errors`, the five helpers and `type ValidationParams` from `@/lib/field-error-client`, `focusField, waitForElement` from `@/lib/field-focus`; a header comment with the usage of "How a form task uses F" (no word "toast" needed; the test bans `from "sonner"`, `\btoast\.` and `useApiError`); `export type FieldErrorMap<K extends string> = Partial<Record<K \| typeof FORM_ERROR_KEY, string>>`; `useValidationMessage` and `useFieldErrors` as F-R4 says | F-R4 |

The hook's lines Step 1 pins, written exactly so:
- `export function useValidationMessage(): (code: string, params?: ValidationParams) => string {`, built with `useCallback` over `resolveValidationMessage(code, params, { validation: { has: (key) => tCommon.has(\`validation.${key}\`), get: (key, values) => tCommon(\`validation.${key}\`, values) }, apiErrors: { has: (key) => tApi.has(key), get: (key) => tApi(key) } })`, with `const tCommon = useTranslations("common")` and `const tApi = useTranslations("apiErrors")`;
- `export function useFieldErrors<K extends string = string>(options?: { params?: Partial<Record<K, ValidationParams>> }) {`;
- state `errors` with a ref `errorsRef` that `setErrors` sets first (`errorsRef.current = next`); a ref `pendingFocus` and a counter state `focusRequest`, which `focusFirst` bumps;
- the effect `useEffect(() => { … }, [focusRequest])` takes the pending request, finds `firstErrorKey(errorsRef.current, request.order)`, and runs an async step `await request.options?.reveal?.(key)`, `const element = await waitForElement(request.options?.idFor?.(key) ?? key)`, `if (!cancelled && element) focusField(element)`, with a cleanup that sets `cancelled`;
- `message(key)` reads the **state** `errors` (not the ref: the React compiler lint forbids reading a ref during render), passes `params?.[key]` except for `_form`;
- `return useMemo(() => ({ errors, setErrors, applyServer, clear, message, focusFirst }), [errors, setErrors, applyServer, clear, message, focusFirst])`.

- [ ] **Step 1: The failing test.** In `tests/v-track-f.test.ts`, replace the import line `import { resolveValidationMessage, validationMessageKey, type MessageLookup } from "../src/lib/field-error-client.ts"` with `import { firstErrorKey, readFieldErrors, resolveValidationMessage, validationMessageKey, withoutKeys, type MessageLookup } from "../src/lib/field-error-client.ts"`, then append (write it with a file tool: it holds `\b`):

```ts

test("one hook holds a form's errors from validate() and from the server, clears them per field and focuses the first (V spec §4.1, §4.3, §7.2)", () => {
  // The server's fieldErrors (FIXED 2): string codes under dotted keys and _form; anything else is ignored.
  assert.deepEqual(readFieldErrors({ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { code: "duplicate", "rows.3.serialNumber": "duplicate", _form: "invalid", count: 3, empty: "" } }), {
    code: "duplicate",
    "rows.3.serialNumber": "duplicate",
    _form: "invalid",
  })
  for (const payload of [null, undefined, "Invalid request data", { error: "Unexpected error" }, { fieldErrors: {} }, { fieldErrors: ["required"] }, { fieldErrors: { name: 1 } }]) {
    assert.equal(readFieldErrors(payload), null, JSON.stringify(payload))
  }
  // The first key in the form's visual order that has an error; _form and keys the form does not show never focus.
  assert.equal(firstErrorKey({ name: "tooLong", code: "required" }, ["code", "name"]), "code")
  assert.equal(firstErrorKey({ _form: "invalid", "rows.3.serialNumber": "duplicate" }, ["code", "name"]), null)
  assert.equal(firstErrorKey({ code: "" }, ["code"]), null)
  // Clearing returns the same map when nothing changes, so a keystroke in a clean field does not render again.
  const errors = { code: "required", name: "tooLong" }
  assert.equal(withoutKeys(errors, ["email"]), errors)
  assert.deepEqual(withoutKeys(errors, ["code", "email"]), { name: "tooLong" })
  const hook = read("src/components/ui/use-field-errors.ts")
  assert.match(hook, /^"use client"\n/)
  assert.match(hook, /export function useFieldErrors<K extends string = string>\(options\?: \{ params\?: Partial<Record<K, ValidationParams>> \}\)/)
  assert.match(hook, /export function useValidationMessage\(\): \(code: string, params\?: ValidationParams\) => string/)
  // Messages: common.validation, then the api-error catalog (spec §7.1).
  assert.match(hook, /useTranslations\("common"\)/)
  assert.match(hook, /useTranslations\("apiErrors"\)/)
  assert.match(hook, /tCommon\.has\(`validation\.\$\{key\}`\)/)
  // The ref keeps focusFirst right after setErrors in the same handler; focus waits for the render that shows the errors.
  assert.match(hook, /errorsRef\.current = next/)
  assert.match(hook, /\}, \[focusRequest\]\)/)
  assert.match(hook, /await request\.options\?\.reveal\?\.\(key\)/)
  assert.match(hook, /waitForElement\(request\.options\?\.idFor\?\.\(key\) \?\? key\)/)
  assert.match(hook, /return useMemo\(\(\) => \(\{ errors, setErrors, applyServer, clear, message, focusFirst \}\)/)
  // Validation never goes through a toast (spec U2): the hook has none, and a form's catch keeps its own.
  assert.doesNotMatch(hook, /from "sonner"|\btoast\.|useApiError/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-f.test.ts`. Expected to fail: the file itself, `SyntaxError: The requested module '../src/lib/field-error-client.ts' does not provide an export named 'firstErrorKey'`.
- [ ] **Step 3: Implement** the three helpers (about 23 lines) and `src/components/ui/use-field-errors.ts` (about 112 lines).
- [ ] **Step 4: Pin edits:** none.
- [ ] **Step 5: Verify.** `node --test tests/v-track-f.test.ts`; `npm test` (2236 tests, 2235 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npm run lint` (the hooks rules of `eslint-plugin-react-hooks` 7 must stay silent on the new file). `node <tools>/eol.mjs src/components/ui/use-field-errors.ts src/lib/field-error-client.ts tests/v-track-f.test.ts` prints `0 112`, `0 62`, `0 185` (the hook's count is the rehearsal's; any count is fine if the file is LF).
- [ ] **Step 6: Commit.** `git add src/components/ui/use-field-errors.ts src/lib/field-error-client.ts tests/v-track-f.test.ts` then `git commit -m "feat(forms): useFieldErrors holds a form's errors from validate() and the server and focuses the first (v-track plan 1 task 14, F4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 15 (F5): One announcement per submit, and a polite live path for errors shown while typing (`src/components/ui/field.tsx`, `asset-form.tsx`)

Spec §7.3, G5, U8, anti-goal "five alerts at once"; F-R6.

**Files:**
- Modify: `src/components/ui/field.tsx` (`i/lf w/lf`), `src/components/assets/asset-form.tsx` (`i/lf w/crlf`)
- Modify: `tests/field-primitives.test.ts`, `tests/asset-forms-ui.test.ts` (both `i/lf w/lf`), `tests/supplier-form-ui.test.ts` (`i/lf w/crlf`; pins and one stale comment)
- Test: `tests/v-track-f.test.ts` (LF)

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `field.tsx:19` | `  error?: React.ReactNode` | the same line, then a two-line comment (for an error a check shows while the person types, spec U8: a polite live region reads each new error once; errors shown by a submit are read through focus and `aria-describedby`) and `  liveError?: boolean` | F-R6 |
| `field.tsx:32` | `function Field({ label, hideLabel, required, hint, error, id, className, labelAction, children }: FieldProps) {` | `function Field({ label, hideLabel, required, hint, error, liveError, id, className, labelAction, children }: FieldProps) {` | F-R6 |
| `field.tsx:68` | `      {error ? <FieldError id={errorId}>{error}</FieldError> : null}` | `      {error ? <FieldError id={errorId} aria-hidden={liveError \|\| undefined}>{error}</FieldError> : null}` and below it `      {liveError ? <span data-slot="field-error-live" className="sr-only" aria-live="polite">{error}</span> : null}` | F-R6 |
| `field.tsx:99-101` | `function FieldError({ className, ...props }: React.ComponentProps<"p">) {` / `  return <p data-slot="field-error" role="alert" className={cn("text-meta text-danger", className)} {...props} />` / `}` | a two-line comment above it (no alert role, and why: one submit is one announcement; live errors use Field liveError; the comment must not contain the text `role="alert"`), then the function with `role="alert" ` removed from the `<p>` | F-R6 |
| `asset-form.tsx:844` | `          <Field label={t("assetTag")} error={duplicateState.assetTagExists` | `          <Field label={t("assetTag")} liveError error={duplicateState.assetTagExists` (the rest stays) | F-R6 |
| `asset-form.tsx:896` | `t("serialNumber")} error={duplicateState.serialNumberExists` | `t("serialNumber")} liveError error={duplicateState.serialNumberExists` (the rest stays) | F-R6 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-f.test.ts`:

```ts

test("errors shown by a submit are read once, through focus, and a live error keeps a polite announcement (V spec §7.3, G5, U8)", () => {
  const field = read("src/components/ui/field.tsx")
  // No alert per error: after a submit the hook focuses the first wrong field, which reads its label and its error
  // (aria-describedby). Five alerts at once are an anti-goal (spec §3).
  assert.match(field, /function FieldError\(\{ className, \.\.\.props \}: React\.ComponentProps<"p">\) \{\n  return <p data-slot="field-error" className=\{cn\("text-meta text-danger", className\)\} \{\.\.\.props\} \/>\n\}/)
  assert.doesNotMatch(field, /role="alert"|aria-live="assertive"/)
  // A check that runs while typing (the asset form's duplicate tag and serial, spec U8) passes liveError: a polite live
  // region that is always there reads each new error once; the visible line is hidden from reading so it is not read twice.
  assert.match(field, /liveError\?: boolean/)
  assert.match(field, /\{liveError \? <span data-slot="field-error-live" className="sr-only" aria-live="polite">\{error\}<\/span> : null\}/)
  assert.match(field, /\{error \? <FieldError id=\{errorId\} aria-hidden=\{liveError \|\| undefined\}>\{error\}<\/FieldError> : null\}/)
  const assetForm = read("src/components/assets/asset-form.tsx")
  assert.match(assetForm, /<Field label=\{t\("assetTag"\)\} liveError error=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : undefined\}>/)
  assert.match(assetForm, /liveError error=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : undefined\}>/)
  assert.equal(assetForm.match(/\bliveError\b/g)?.length, 2)
  // SearchableSelect renders the same FieldError, so its errors follow the same rule.
  assert.match(read("src/components/ui/searchable-select.tsx"), /<FieldError id=\{errorId\}>/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-f.test.ts`. Expected to fail: "errors shown by a submit are read once, through focus, and a live error keeps a polite announcement (V spec §7.3, G5, U8)".
- [ ] **Step 3: Implement** per the Changes table (exact string replacement; keep each file's line endings).
- [ ] **Step 4: Pin edits** (each old string occurs once):
  - `tests/field-primitives.test.ts:88`: old `  assert.match(field, /role="alert"/)` → new `  assert.doesNotMatch(field, /role="alert"/, "one announcement per submit: focus reads the error (V track spec §7.3)")`.
  - `tests/field-primitives.test.ts:168`: old `  assert.match(field, /function Field\(\{ label, hideLabel, required, hint, error, id, className, labelAction, children \}: FieldProps\)/)` → new `  assert.match(field, /function Field\(\{ label, hideLabel, required, hint, error, liveError, id, className, labelAction, children \}: FieldProps\)/)`.
  - `tests/asset-forms-ui.test.ts:25-26`: old `/<Field label=\{t\("assetTag"\)\} error=\{duplicateState` → new `/<Field label=\{t\("assetTag"\)\} liveError error=\{duplicateState`; old `  assert.match(source, /error=\{duplicateState\.serialNumberExists` → new `  assert.match(source, /liveError error=\{duplicateState\.serialNumberExists` (the rest of both lines stays).
  - `tests/supplier-form-ui.test.ts:18` (a comment): old `aria-invalid, aria-describedby and role="alert" (FieldError,` → new `aria-invalid and aria-describedby (FieldError, no alert role,`.
  Without them the rehearsal failed "Field wires label, hint and error to its control without starting browser validation", "Field puts labelAction beside the label, outside the <label>" and "asset form: the duplicate tag and serial errors belong to their fields (K4 a)".
- [ ] **Step 5: Verify.** `node --test tests/v-track-f.test.ts tests/field-primitives.test.ts tests/asset-forms-ui.test.ts tests/form-migration-guards.test.ts tests/supplier-form-ui.test.ts`; `npm test` (2237 tests, 2236 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npm run lint`. `node <tools>/eol.mjs src/components/ui/field.tsx src/components/assets/asset-form.tsx tests/field-primitives.test.ts tests/asset-forms-ui.test.ts tests/v-track-f.test.ts` prints `0 109`, `1773 1773`, `0 200`, `0 133`, `0 204`.
- [ ] **Step 6: Commit.** `git add src/components/ui/field.tsx src/components/assets/asset-form.tsx tests/field-primitives.test.ts tests/asset-forms-ui.test.ts tests/supplier-form-ui.test.ts tests/v-track-f.test.ts` then `git commit -m "feat(forms): one announcement per submit, and a polite live path for errors shown while typing (v-track plan 1 task 15, F5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 16 (F6): SearchableSelect shows the field error look and turns teal on focus; its wrappers pass id and error on (`field-variants.ts`, `searchable-select.tsx`, two wrappers)

Spec §7.3 (SearchableSelect), DESIGN.md:474 (a focused field turns teal); F-R7.

**Files:**
- Modify: `src/components/ui/field-variants.ts` (`i/lf w/lf`), `src/components/ui/searchable-select.tsx`, `src/components/maintenance/maintenance-option-select.tsx`, `src/components/audit/audit-scan-check-field.tsx` (`i/lf w/crlf`)
- Modify: `tests/field-primitives.test.ts` (`i/lf w/lf`; pin)
- Test: `tests/v-track-f.test.ts` (LF)

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `field-variants.ts:36` | `export const textareaClasses = …` | above it: a three-line comment (the trigger is a button and takes no aria-invalid; data-invalid and these classes give the error look and the teal ring back while focused or open; data-* comes after focus and aria-* in Tailwind's order, hence the compound rows), `export const triggerInvalidClasses =` and on the next line, indented two spaces, the exact string Step 1 asserts, then a blank line | F-R7 |
| `searchable-select.tsx:6` | `import { fieldControlVariants, type FieldSize } from "@/components/ui/field-variants"` | `import { fieldControlVariants, triggerInvalidClasses, type FieldSize } from "@/components/ui/field-variants"` | F-R7 |
| `searchable-select.tsx:88` | `              disabled={disabled}` | the same line, then `              data-invalid={error ? true : undefined}` | F-R7 |
| `searchable-select.tsx:92` | `                error ? "border-danger ring-1 ring-danger shadow-field-error" : undefined,` | `                triggerInvalidClasses,` | F-R7 |
| `maintenance-option-select.tsx:11` | `  type,` (first destructured prop) | `  id,` above it | F-R7 |
| `maintenance-option-select.tsx:22` | `  hint,` | the same line, then `  error,` | F-R7 |
| `maintenance-option-select.tsx:24-25` | `}: {` / `  type: MaintenanceOptionType` | between them: `  // The trigger's id, so the form's focusFirst can reach it; the error shows under the select.` and `  id?: string` | F-R7 |
| `maintenance-option-select.tsx:36` | `  hint?: React.ReactNode` | the same line, then `  error?: React.ReactNode` | F-R7 |
| `maintenance-option-select.tsx:84`, `:93` | `      <SearchableSelect`; `        hint={hint}` | `        id={id}` directly below `<SearchableSelect`; `        error={error}` directly below `hint={hint}` | F-R7 |
| `audit-scan-check-field.tsx:7`, `:15` | `  label,` (first prop); `  labelFor,` | `  id,` above `label,`; `  error,` below `labelFor,` | F-R7 |
| `audit-scan-check-field.tsx:17-18` | `}: {` / `  label: string` | between them: `  // The trigger's id, so the check form's focusFirst can reach it; the error shows under the select.` and `  id?: string` | F-R7 |
| `audit-scan-check-field.tsx:26` | `  labelFor: (id: string) => string` | the same line, then `  error?: React.ReactNode` | F-R7 |
| `audit-scan-check-field.tsx:39`, `:48` | `      <SearchableSelect`; `        clearLabel={t("clearValue")}` | `        id={id}` directly below `<SearchableSelect`; `        error={error}` directly below `clearLabel=…` | F-R7 |

- [ ] **Step 1: The failing test.** In `tests/v-track-f.test.ts`, add the line `import { triggerInvalidClasses } from "../src/components/ui/field-variants.ts"` directly above the `../src/lib/validation-rules.ts` import, then append:

```ts

test("SearchableSelect shows the field error look, turns teal while focused or open, and its wrappers pass id and error on (V spec §7.3)", () => {
  // The trigger is a button, which takes no aria-invalid (jsx-a11y): data-invalid carries the state, the classes live
  // with the other field classes, and the error is tied by aria-describedby (field-primitives.test.ts).
  assert.equal(
    triggerInvalidClasses,
    "data-invalid:border-danger data-invalid:ring-1 data-invalid:ring-danger data-invalid:shadow-field-error data-invalid:focus:border-ring data-invalid:focus:ring-ring data-invalid:focus:shadow-field-focus data-invalid:aria-expanded:border-ring data-invalid:aria-expanded:ring-ring data-invalid:aria-expanded:shadow-field-focus",
  )
  assert.doesNotMatch(triggerInvalidClasses, /focus:(?:border|ring)-danger|aria-expanded:(?:border|ring)-danger/)
  const select = read("src/components/ui/searchable-select.tsx")
  assert.match(select, /import \{ fieldControlVariants, triggerInvalidClasses, type FieldSize \} from "@\/components\/ui\/field-variants"/)
  assert.match(select, /\n\s+data-invalid=\{error \? true : undefined\}\n/)
  assert.match(select, /\n\s+triggerInvalidClasses,\n/)
  assert.doesNotMatch(select, /"border-danger ring-1 ring-danger shadow-field-error"/)
  // The trigger id is the caller's id when given, so focusFirst finds it (stable ids: the form names them).
  assert.match(select, /const triggerId = id \?\? `\$\{generatedId\}-trigger`/)
  for (const path of ["src/components/maintenance/maintenance-option-select.tsx", "src/components/audit/audit-scan-check-field.tsx"]) {
    const source = read(path)
    assert.match(source, /\n\s+id\?: string\n/, path)
    assert.match(source, /\n\s+error\?: React\.ReactNode\n/, path)
    assert.match(source, /<SearchableSelect\n\s+id=\{id\}\n/, path)
    assert.match(source, /\n\s+error=\{error\}\n/, path)
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-f.test.ts`. Expected to fail: the file itself, `SyntaxError: The requested module '../src/components/ui/field-variants.ts' does not provide an export named 'triggerInvalidClasses'`.
- [ ] **Step 3: Implement** per the Changes table (exact string replacement; keep each file's line endings).
- [ ] **Step 4: Pin edit.** `tests/field-primitives.test.ts:115-116` (test "SearchableSelect uses the field look, a real label, and announces the chosen value"): old
  `  // from classes and screen readers get the message through aria-describedby and the alert role.` / `  assert.match(source, /error \? "border-danger ring-1 ring-danger shadow-field-error" : undefined/)` → new `  // from data-invalid and triggerInvalidClasses (field-variants.ts, teal again while focused or open), and screen` / `  // readers get the message through aria-describedby.` / `  assert.match(source, /data-invalid=\{error \? true : undefined\}/)` / `  assert.match(source, /\n\s+triggerInvalidClasses,\n/)`. `:117` (`assert.doesNotMatch(source, /aria-invalid/)`) stays. Without it that test fails.
- [ ] **Step 5: Verify.** `node --test tests/v-track-f.test.ts tests/field-primitives.test.ts tests/form-migration-guards.test.ts tests/visual-foundation-guards.test.ts tests/maintenance-option-select.test.ts tests/maintenance-sweep-ui.test.ts tests/phase2d-final-ui.test.ts tests/audit-scan-check-ui.test.ts tests/audit-scan-sweep-ui.test.ts tests/searchable-select-accessibility.test.ts tests/menu-primitives-ui.test.ts`; `npm test` (2238 tests, 2237 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npm run lint`. `node <tools>/eol.mjs src/components/ui/field-variants.ts src/components/ui/searchable-select.tsx src/components/maintenance/maintenance-option-select.tsx src/components/audit/audit-scan-check-field.tsx tests/field-primitives.test.ts tests/v-track-f.test.ts` prints `0 64`, `143 143`, `109 109`, `64 64`, `0 202`, `0 229`.
- [ ] **Step 6: Commit.** `git add src/components/ui/field-variants.ts src/components/ui/searchable-select.tsx src/components/maintenance/maintenance-option-select.tsx src/components/audit/audit-scan-check-field.tsx tests/field-primitives.test.ts tests/v-track-f.test.ts` then `git commit -m "feat(forms): SearchableSelect shows the field error look and turns teal on focus; its wrappers pass id and error on (v-track plan 1 task 16, F6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 17 (F7): FieldGroup shows a group's error under the group and ties it to the fieldset (`src/components/ui/field-group.tsx`)

Spec §7.3 (groups); F-R8.

**Files:**
- Create: `src/components/ui/field-group.tsx` (LF, new)
- Test: `tests/v-track-f.test.ts` (LF)

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| new file `src/components/ui/field-group.tsx` | — | imports `* as React from "react"`, `FieldError, FieldHint, FieldRequiredMark` from `@/components/ui/field`, `fieldLabelClasses` from `@/components/ui/field-variants`, `cn` from `@/lib/utils`; `type FieldGroupProps = { legend: React.ReactNode; required?: boolean; hint?: React.ReactNode; error?: React.ReactNode; id?: string; className?: string; children: React.ReactNode }` with a comment on `id` (focusFirst focuses the group's first control) and on `children`; a header comment (a group of choices with one label, hint and error; the error is tied to the fieldset; server-safe like Field); the component with `const groupId = id ?? React.useId()`-style id (call `React.useId()` unconditionally, then `id ?? generatedId`), `hintId`/`errorId` as `${groupId}-hint`/`${groupId}-error` when present, and the markup Step 1 pins; the hint line `{hint ? <FieldHint id={hintId} className="mt-1.5">{hint}</FieldHint> : null}` before the error line; `export { FieldGroup }`. No `"use client"`, no other hook. | F-R8 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-f.test.ts`:

```ts

test("a group of choices shows its error under the group, tied to the group, and focus goes to its first control (V spec §7.3)", () => {
  const group = read("src/components/ui/field-group.tsx")
  // Server-safe like Field: useId is its only hook.
  assert.doesNotMatch(group, /"use client"|\buse(?:State|Effect|LayoutEffect|Context)\b|\bcreateContext\b/)
  assert.match(group, /function FieldGroup\(\{ legend, required, hint, error, id, className, children \}: FieldGroupProps\)/)
  // The group is the fieldset the old markup used (legend with the shared label class and star), with an id for
  // focusFirst and data-slot="field-group" for the focus helper, which measures it and focuses its first control.
  assert.match(group, /<fieldset id=\{groupId\} data-slot="field-group" aria-describedby=\{describedBy\} className=\{cn\("min-w-0", className\)\}>/)
  assert.match(group, /<legend className=\{cn\(fieldLabelClasses, "mb-1\.5"\)\}>\s*\{legend\}\s*\{required \? <FieldRequiredMark \/> : null\}\s*<\/legend>/)
  // Error before hint, as Field reads them; the error id is <group id>-error.
  assert.match(group, /const describedBy = \[errorId, hintId\]\.filter\(Boolean\)\.join\(" "\) \|\| undefined/)
  assert.match(group, /const errorId = error \? `\$\{groupId\}-error` : undefined/)
  assert.match(group, /\{error \? <FieldError id=\{errorId\} className="mt-1\.5">\{error\}<\/FieldError> : null\}/)
  assert.match(group, /export \{ FieldGroup \}/)
  assert.match(read("src/lib/field-focus.ts"), /\[data-slot="field-group"\]/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-f.test.ts`. Expected to fail: "a group of choices shows its error under the group, tied to the group, and focus goes to its first control (V spec §7.3)" (the file does not exist yet; `read` throws ENOENT inside the test).
- [ ] **Step 3: Implement** `src/components/ui/field-group.tsx` (about 41 lines).
- [ ] **Step 4: Pin edits:** none. FMG GF7/GF8, VFG and the field-primitives tests stay green unchanged.
- [ ] **Step 5: Verify.** `node --test tests/v-track-f.test.ts tests/form-migration-guards.test.ts tests/visual-foundation-guards.test.ts tests/field-primitives.test.ts`; `npm test` (2239 tests, 2238 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npm run lint`. `node <tools>/eol.mjs src/components/ui/field-group.tsx tests/v-track-f.test.ts` prints `0 41` (any count if LF) and `0 246`.
- [ ] **Step 6: Commit.** `git add src/components/ui/field-group.tsx tests/v-track-f.test.ts` then `git commit -m "feat(forms): FieldGroup shows a group's error under the group and ties it to the fieldset (v-track plan 1 task 17, F7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 18 (F8): The V track guards: the 51-form scope, the V_FORMS rules and the countdown of unchecked required selects (`tests/validation-guards.test.ts`)

Spec §5, §8 (guards); FIXED 7; F-R9, F-R10. This task changes no `src` file: the guard locks today's scope and counts, and its rules for `V_FORMS` start with an empty list that area M fills.

**Files:**
- Create: `tests/validation-guards.test.ts` (LF, new; 6 tests)
- Create: `tests/helpers/validation-reader.ts` (LF, new)

- [ ] **Step 1: The failing test.** Create `tests/validation-guards.test.ts` (LF) with exactly (write it with a file tool):

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { countByFile, findJsxTags, hasJsxAttr, jsxAttrValue, readSourceFiles } from "./helpers/source-files.ts"
import { linesOutsideCatch, withoutBlockComments } from "./helpers/validation-reader.ts"

// The V track guards (spec docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §5, §8): every form a person
// submits is in V_SCOPE; a form joins V_FORMS in the commit that moves it to errors under the field, and from then on it
// validates itself (validate(), noValidate right after onSubmit), shows no toast outside a catch, and gives every
// required select an id and an error. SELECT_STAR_ONLY counts down the required selects that nothing checks yet; the
// V track ends with V_FORMS equal to V_SCOPE and SELECT_STAR_ONLY empty. Never add a row to make a guard pass.
const sources = readSourceFiles("src")
const C = "src/components/"
const read = (path: string) => sources.find((file) => file.path === path)?.source ?? ""

// The 51 forms of the scope list (spec §5, the recon inventory at 9e17cab), by the file that holds each form's submit
// handler, with the number of forms in that file. Formless submits (a button and a handler) count too.
const V_SCOPE: Readonly<Record<string, number>> = {
  [`${C}assets/asset-form.tsx`]: 1,
  [`${C}assets/asset-batch-form.tsx`]: 1,
  [`${C}assets/asset-register-table.tsx`]: 1,
  [`${C}assets/asset-component-manager.tsx`]: 2,
  [`${C}assets/asset-status-correction-button.tsx`]: 1,
  [`${C}assets/asset-import-preview-panel.tsx`]: 1,
  [`${C}assets/asset-label-print.tsx`]: 1,
  [`${C}asset-operations/checkout-form.tsx`]: 1,
  [`${C}asset-operations/checkin-form.tsx`]: 1,
  [`${C}asset-operations/transfer-form.tsx`]: 1,
  [`${C}asset-operations/bulk-move-form.tsx`]: 1,
  [`${C}asset-operations/transaction-cancel-dialog.tsx`]: 1,
  [`${C}audit/audit-round-form.tsx`]: 1,
  [`${C}audit/audit-round-cancel-button.tsx`]: 1,
  [`${C}audit/audit-mark-not-found-button.tsx`]: 1,
  [`${C}audit/audit-finding-review-actions.tsx`]: 3,
  [`${C}audit/audit-findings-batch-actions.tsx`]: 1,
  [`${C}audit/audit-scan-check-form.tsx`]: 1,
  [`${C}audit/audit-scan-component-missing-dialog.tsx`]: 1,
  [`${C}disposal/disposal-request-form.tsx`]: 1,
  [`${C}disposal/disposal-batch-form.tsx`]: 1,
  [`${C}disposal/disposal-decision-button.tsx`]: 1,
  [`${C}disposal/disposal-execution-button.tsx`]: 1,
  [`${C}disposal/disposal-bulk-approval.tsx`]: 1,
  [`${C}disposal/disposal-bulk-execution.tsx`]: 1,
  [`${C}maintenance/maintenance-plan-form.tsx`]: 1,
  [`${C}maintenance/repair-record-form.tsx`]: 1,
  [`${C}maintenance/repair-record-actions.tsx`]: 3,
  [`${C}master-data/brand-form.tsx`]: 1,
  [`${C}master-data/branch-form.tsx`]: 1,
  [`${C}master-data/category-form.tsx`]: 1,
  [`${C}master-data/company-form.tsx`]: 1,
  [`${C}master-data/department-form.tsx`]: 1,
  [`${C}master-data/employee-form.tsx`]: 1,
  [`${C}master-data/location-form.tsx`]: 1,
  [`${C}master-data/asset-model-form.tsx`]: 1,
  [`${C}master-data/supplier-form.tsx`]: 1,
  [`${C}admin/admin-user-form.tsx`]: 1,
  [`${C}admin/role-permission-form.tsx`]: 1,
  [`${C}admin/system-settings-form.tsx`]: 2,
  [`${C}admin/IntegrationClientManager.tsx`]: 2,
  [`${C}admin/asset-state-review-dialog.tsx`]: 1,
  [`${C}admin/data-quality-rule-form.tsx`]: 1,
  [`${C}reports/report-preset-controls.tsx`]: 1,
}

// Files with a <form> that is not role="search" and not in V_SCOPE, each with why (spec §3 non-goals, §5 "Left out").
const NOT_IN_SCOPE: Readonly<Record<string, string>> = {
  [`${C}auth/login-form.tsx`]: "the login form keeps its own inline error (spec §3, §5)",
  [`${C}ui/confirm-text-dialog.tsx`]: "the shared confirm-text dialog: the scope counts its caller, audit-findings-batch-actions.tsx",
}

// The files whose every form shows its errors under the fields (spec G1). Each form task adds its file here, in the
// commit that moves the file's last form.
const V_FORMS: readonly string[] = []

// Required selects (SearchableSelect and its two wrappers) with no error=: an asterisk that nothing checks (spec §5).
// Exact counts at the plan's base; a row drops in the commit that gives its selects their errors, and a new one fails.
const SELECT_STAR_ONLY: Readonly<Record<string, number>> = {
  [`${C}asset-operations/bulk-move-form.tsx`]: 1,
  [`${C}asset-operations/checkin-form.tsx`]: 3,
  [`${C}asset-operations/checkout-form.tsx`]: 2,
  [`${C}asset-operations/transfer-form.tsx`]: 1,
  [`${C}audit/audit-scan-check-form.tsx`]: 1,
  [`${C}disposal/disposal-batch-form.tsx`]: 1,
  [`${C}disposal/disposal-execution-button.tsx`]: 1,
  [`${C}disposal/disposal-request-form.tsx`]: 1,
  [`${C}maintenance/maintenance-plan-form.tsx`]: 1,
  [`${C}maintenance/repair-record-form.tsx`]: 2,
}

const SELECT_TAGS = ["SearchableSelect", "MaintenanceOptionSelect", "AuditScanCheckField"]
const VALIDATION_TOAST = /\btoast\.(?:error|warning)\(/g
const formTags = (source: string) => findJsxTags(withoutBlockComments(source), ["form"]).filter((tag) => jsxAttrValue(tag.text, "role") !== "search")
const starOnlySelects = (source: string) => findJsxTags(source, SELECT_TAGS).filter((tag) => hasJsxAttr(tag.text, "required") && !hasJsxAttr(tag.text, "error"))

test("the V readers skip comments and see a catch block, a .catch() handler and a string with braces", () => {
  const source = [
    "function save() {",
    '  if (!name) toast.error(t("nameRequired"))',
    "  try {",
    '    run("{ not a brace }")',
    "  } catch (error) {",
    "    const later = () => { toast.error(describe(error)) }",
    "    later()",
    "  }",
    "  fetch(url).catch(() => toast.warning(labels.offline))",
    "  try { run() } catch {",
    "    toast.error(labels.failed)",
    "  }",
    "  toast.warning(labels.after)",
    "}",
    '{/* The form is the panel: a <form onSubmit={x}> cannot be ContentPanel. */}',
    '<form role="search" onSubmit={search}>',
    '<input accept="image/*" />',
    "<form onSubmit={handleSubmit} noValidate>",
  ].join("\n")
  assert.deepEqual(linesOutsideCatch(source, VALIDATION_TOAST), [2, 13])
  assert.deepEqual(formTags(source).map((tag) => tag.line), [18])
  assert.equal(withoutBlockComments(source).split("\n").length, source.split("\n").length, "line numbers stay")
  assert.match(withoutBlockComments(source), /accept="image\/\*"/)
  const select = '<SearchableSelect id="x" required error={e} />\n<SearchableSelect required />\n<MaintenanceOptionSelect required={required} />\n<AuditScanCheckField label="a" />'
  assert.deepEqual(starOnlySelects(select).map((tag) => tag.line), [2, 3])
})

test("V1 the scope list names every form a person submits, 51 in all (spec §5)", () => {
  const exists = (path: string) => sources.some((file) => file.path === path)
  const problems: string[] = []
  for (const path of [...Object.keys(V_SCOPE), ...Object.keys(NOT_IN_SCOPE), ...V_FORMS, ...Object.keys(SELECT_STAR_ONLY)]) if (!exists(path)) problems.push(`${path} not found`)
  for (const path of Object.keys(NOT_IN_SCOPE)) if (Object.hasOwn(V_SCOPE, path)) problems.push(`${path} is in V_SCOPE and NOT_IN_SCOPE`)
  for (const path of V_FORMS) if (!Object.hasOwn(V_SCOPE, path)) problems.push(`V_FORMS: ${path} is not in V_SCOPE`)
  if (new Set(V_FORMS).size !== V_FORMS.length) problems.push("V_FORMS lists a file twice")
  // A new <form> anywhere in src joins the scope (or says why it stays out) in the commit that adds it.
  for (const file of sources) {
    const forms = formTags(file.source).length
    if (forms === 0) continue
    if (Object.hasOwn(NOT_IN_SCOPE, file.path)) continue
    if (!Object.hasOwn(V_SCOPE, file.path)) problems.push(`${file.path}: ${forms} <form> not in V_SCOPE`)
    else if (forms > V_SCOPE[file.path]) problems.push(`${file.path}: ${forms} <form>, V_SCOPE counts ${V_SCOPE[file.path]}`)
  }
  assert.deepEqual(problems, [])
  assert.equal(Object.values(V_SCOPE).reduce((sum, count) => sum + count, 0), 51)
})

test("V2 a moved form checks itself: validate() and noValidate right after onSubmit (spec §4.5)", () => {
  const problems: string[] = []
  for (const path of V_FORMS) {
    const source = read(path)
    if (!/\bvalidate\(/.test(source)) problems.push(`${path}: no validate(`)
    for (const tag of formTags(source)) {
      const onSubmit = jsxAttrValue(tag.text, "onSubmit")
      if (onSubmit === null || !tag.text.includes(`onSubmit={${onSubmit}} noValidate`)) problems.push(`${path}:${tag.line}: <form> without noValidate right after onSubmit`)
    }
  }
  assert.deepEqual(problems, [])
})

test("V3 a moved form shows no toast outside a catch: validation errors sit under their fields (spec U2)", () => {
  const problems = V_FORMS.flatMap((path) => linesOutsideCatch(read(path), VALIDATION_TOAST).map((line) => `${path}:${line}`))
  assert.deepEqual(problems, [], "show the error under its field (useFieldErrors); a catch keeps its toast for other failures")
})

test("V4 a required select in a moved form has an id for focus and shows its error (spec §7.3)", () => {
  const problems: string[] = []
  for (const path of V_FORMS) {
    for (const tag of findJsxTags(read(path), SELECT_TAGS)) {
      if (!hasJsxAttr(tag.text, "required")) continue
      if (!hasJsxAttr(tag.text, "id") || !hasJsxAttr(tag.text, "error")) problems.push(`${path}:${tag.line}: required <${tag.name}> needs id= and error=`)
    }
  }
  assert.deepEqual(problems, [])
})

test("V5 the required selects that nothing checks only count down (spec §5)", () => {
  assert.deepEqual(countByFile(sources, (file) => starOnlySelects(file.source).length), SELECT_STAR_ONLY)
  for (const path of V_FORMS) assert.ok(!Object.hasOwn(SELECT_STAR_ONLY, path), `${path} is a V form and still has a star-only select`)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/validation-guards.test.ts`. Expected to fail: the file itself, `ERR_MODULE_NOT_FOUND` for `tests/helpers/validation-reader.ts`.
- [ ] **Step 3: Implement.** Create `tests/helpers/validation-reader.ts` (LF) with exactly:

```ts
// Readers for tests/validation-guards.test.ts (V track spec §8). Not a parser, like ./source-files.ts: when a guard
// misreads a file, fix the reader and add the case to the reader test; never add a row to make a guard pass.

// The source with JSX comments ({/* … */}) and block comments that start a line blanked out, line breaks kept, so a
// comment that names <form> is not read as a form. A "/*" inside a string (accept="image/*") is left alone.
export function withoutBlockComments(source: string): string {
  const blank = (text: string) => text.replace(/[^\n]/g, " ")
  return source.replace(/\{\/\*[\s\S]*?\*\/\}/g, blank).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, blank)
}

// The index of the bracket that closes the one at `open`, skipping one-line '…' and "…" strings.
function closingIndex(source: string, open: number, openChar: string, closeChar: string): number {
  let depth = 0
  for (let index = open; index < source.length; index++) {
    const char = source[index]
    if (char === '"' || char === "'") {
      const end = source.indexOf(char, index + 1)
      if (end !== -1 && !source.slice(index, end).includes("\n")) {
        index = end
        continue
      }
    }
    if (char === openChar) depth++
    else if (char === closeChar && --depth === 0) return index
  }
  return source.length
}

// Where a catch runs: the block of `catch {` / `catch (error) {`, and the argument of `.catch(…)`.
export function catchRanges(source: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  for (const match of source.matchAll(/\bcatch\s*(?:\([^)]*\))?\s*\{/g)) {
    const open = match.index + match[0].length - 1
    ranges.push([open, closingIndex(source, open, "{", "}")])
  }
  for (const match of source.matchAll(/\.catch\(/g)) {
    const open = match.index + match[0].length - 1
    ranges.push([open, closingIndex(source, open, "(", ")")])
  }
  return ranges
}

// The 1-based lines of every match of `pattern` (a global regex) outside a catch.
export function linesOutsideCatch(source: string, pattern: RegExp): number[] {
  const ranges = catchRanges(source)
  return [...source.matchAll(pattern)]
    .filter((match) => !ranges.some(([start, end]) => match.index > start && match.index < end))
    .map((match) => source.slice(0, match.index).split("\n").length)
}
```

- [ ] **Step 4: Guard edits:** none. If V1 or V5 fails, a count moved since `71e5251` (another task added a form or a select): stop and report the failing line; never edit a row to make it pass.
- [ ] **Step 5: Verify.** `node --test tests/validation-guards.test.ts` (6 tests pass); `npm test` (2245 tests, 2244 pass, 0 fail, 1 skipped; +6); `npx tsc --noEmit`; `npm run lint`. `node <tools>/eol.mjs tests/validation-guards.test.ts tests/helpers/validation-reader.ts` prints `0 174` and `0 49`.
- [ ] **Step 6: Commit.** `git add tests/validation-guards.test.ts tests/helpers/validation-reader.ts` then `git commit -m "test(forms): V track guards: the 51-form scope, V_FORMS rules and the countdown of unchecked required selects (v-track plan 1 task 18, F8)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

**For every M task (and later plans), the guard row edit** (A-R5 gives Task 19's exact edit and where the later rows go): in `tests/validation-guards.test.ts`, the line `const V_FORMS: readonly string[] = []` grows one file per form task, written `` `${C}master-data/supplier-form.tsx`, `` (one path per line once there are two: `const V_FORMS: readonly string[] = [` / the rows / `]`); a task that gives a `SELECT_STAR_ONLY` file's selects their `id=`/`error=` lowers or deletes that row in the same commit.

---

### Rehearsal (area F)

Scratch clone `<temp>/sim-F` of `71e5251` (`git clone --no-hardlinks` of `v-sim`, CRLF working tree, `core.autocrlf=true`, its own copy of `node_modules`), branch `f-dry`. Area S was stood in by one marked commit `cf0f2a19` ("STAND-IN for area S", `src/lib/field-errors.ts` with `FORM_ERROR_KEY`, the `FieldErrorCode` and `FieldErrors` types, `IssueLike` and `fieldErrorKey` only). Then F1–F8 ran in order, one commit each, every step as written:

| Task | Commit | Step 2 failed with | `npm test` after (tests / pass / fail / skipped) |
|---|---|---|---|
| base + stand-in | `cf0f2a19` | — | 2226 / 2225 / 0 / 1 |
| F1 | `827e4e19` | `ERR_MODULE_NOT_FOUND` `src/lib/validation-rules.ts` | 2227 / 2226 / 0 / 1 |
| F2 | `83d13191` | `ERR_MODULE_NOT_FOUND` `src/lib/field-error-client.ts` (then the named test until the messages were applied) | 2228 / 2227 / 0 / 1 |
| F3 | `45f25d04` | `ERR_MODULE_NOT_FOUND` `src/lib/field-focus.ts` | 2229 / 2228 / 0 / 1 |
| F4 | `2d0a4f43` | `SyntaxError` … no export named `firstErrorKey` | 2230 / 2229 / 0 / 1 |
| F5 | `838d367c` | the named test; after the source change, the three pinned tests named in Step 4 until their pins were edited | 2231 / 2230 / 0 / 1 |
| F6 | `0419878f` | `SyntaxError` … no export named `triggerInvalidClasses`; after the source change, "SearchableSelect uses the field look, a real label, and announces the chosen value" until its pin was edited | 2232 / 2231 / 0 / 1 |
| F7 | `c3667944` | the named test | 2233 / 2232 / 0 / 1 |
| F8 | `d8695cd9` | `ERR_MODULE_NOT_FOUND` `tests/helpers/validation-reader.ts` | 2239 / 2238 / 0 / 1 |

Every commit ended with `npx tsc --noEmit` clean and full `npx eslint .` at 0 errors and 146 warnings, all under `.agents/`. Messages 4067 → 4084. Extra checks:
- **Focus helper in Chromium** (F-R5): the numbers there.
- **Tailwind order** (F-R7): `@tailwindcss/node` `compile()` of the candidates with the repo's Tailwind; the rule order there.
- **Guard mutations** (F8): deleting the `brand-form.tsx` row of `V_SCOPE` failed V1 with `src/components/master-data/brand-form.tsx: 1 <form> not in V_SCOPE`; adding `supplier-form.tsx` to `V_FORMS` failed V2 (`no validate(`, `:160: <form> without noValidate right after onSubmit`) and V3 (the toast at `:133`); both restored.

**What the rehearsal changed in this text:**
- F2: the test's loop of codes first held `invalid`, which resolves to the generic sentence by definition; it now lists the 11 other codes and checks `invalid` on its own line.
- F4: the hook test first banned the word `toast` anywhere, which the header comment's usage line tripped; it now bans `from "sonner"`, `\btoast\.` and `useApiError`. A shell-written edit turned `\b` into a backspace byte: blocks with regex backslashes are written with a file tool (Global Constraints).
- F5: a first comment on `FieldError` quoted the alert role literally and failed the test's `doesNotMatch`; the Changes row now says the comment must not contain it.
- F8: the reader first read the JSX comments of `admin-user-form.tsx:124` and `asset-model-form.tsx:234` as `<form>`s; `withoutBlockComments` blanks them, and the reader test holds that case and `accept="image/*"`.
- Not rehearsed: the hook running in React (no DOM test library in the repo, and no dev server in a rehearsal). Its pure half is unit-tested, `tsc` and the hooks lint pass, and the first M form task plus the controller's dev-app check exercise it; Review Focus should read the effect and the ref in F4.

---

## Area M: the master-data and admin forms show their errors under the field, and the server's refusals land on the same fields (Tasks 19–29, M1–M11)

Spec `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` (approved 2026-10-17) §2 U1, U2, U5, U6, U9; §3 G1–G3, G5 and the anti-goals; §4.1 (on submit), §4.3 (clearing), §4.4 (content rules and prerequisites), §4.5 (native constraints); §5 forms #34–#44, #47–#50 and #52; §7.1–§7.3 (as used, not built); §11 calls 1, 2, 7. Area M runs **after areas S and F**: it uses FIXED INTERFACES 3 (the hook), 4 (the rule helpers), 5 (`common.validation.*`), 6 (the form convention) and 7 (`tests/validation-guards.test.ts`, `V_FORMS`), and the server bodies of FIXED 2 (400 `VALIDATION_FAILED` with `fieldErrors`, 409 `DUPLICATE` with `fieldErrors`, the §6.2 non-zod refusals with `fieldErrors`). It edits no file of S or F except the `V_FORMS` list (one row per form, FIXED 7).

What this area does, in one line each:
- **M1** brand, company, department: the pattern every later task repeats (M-R1–M-R5).
- **M2** branch, location: the same, and the "no company" / "no branch" gate keeps a visible reason and `aria-disabled` (M-R10).
- **M3** employee: the email rule, and a company change clears the branch and department errors with it.
- **M4** supplier: off its own parser, toast and messages, onto the hook and `common.validation` (M-R6).
- **M5** category: the custom-field and photo-checklist rows get errors under their fields, keyed like the server's dotted paths (M-R7).
- **M6** asset model.
- **M7** admin user: the password rule of create and edit, one error under the role group (M-R8).
- **M8** role: the key's length and pattern, one error above the permission table.
- **M9** integration clients, create and edit: "at least one scope" becomes an error on submit (no silent rule, no disabled save), and the server's reason is no longer thrown away (M-R11, M-R13).
- **M10** asset state review: the 10-character reason becomes an error on submit; the workspace hands a refusal back to the dialog (M-R9).
- **M11** the data-quality rules and the report preset name become `<form>`s that validate themselves; the rules' bare `catch` shows the server's reason (M-R12).

Nothing else changes: no migration, no API change (area S owns the server), no new dependency, no `EXEMPT` row, no `CONSTRAINT_FLOORS` change (every `required` / `maxLength` / `minLength` stays), no `STAR_ONLY` change (none of its three entries is in these files), no change to DESIGN.md (the final plan). Messages: +2 (M2), −3 (M4).

Line numbers are of `71e5251` (= `9e17cab` for every file of this area); areas S and F do not touch these files except `c/master-data/supplier-form.tsx`, where Task 7 (S7) rewrites the three `if (code === …)` lines of `getErrorMessage` in place, so they hold when M runs. Find every site by its quoted text.

**Area rehearsal** (before the plan's dry run; the dry run replays on the real S and F, A-R2). The eleven tasks ran in order, one commit each, in a clone of `71e5251` with its own copy of `node_modules` (`<temp>/sim-M`, branch `m-sim`), on one marked stand-in commit for what M uses of S and F (`2758ccaf`, not a plan task): `src/lib/validation-rules.ts` (the eight helpers, the contract of M-R3), `src/lib/field-errors.ts` (the types), `src/components/ui/use-field-errors.ts` (the hook with the contract of M-R3), the twelve `common.validation.*` messages (wording of the stand-in, not F's), and `tests/validation-guards.test.ts` with an empty `V_FORMS` and the "noValidate, validate(, no toast outside a catch" check. Every Step 2 failed with the test it names; every task ended with full `npm test` 0 fail and 1 skipped, `npx tsc --noEmit` clean and `npm run lint` 0 errors and 146 warnings (all under `.agents/`). The test helper of M1 was widened twice during the rehearsal (M7: an id may sit inside `id={…}` for the first checkbox of a group; M11: `server: false` for the preset name); the text below carries the final helper in M1's block, and the chain was then replayed from the stand-in commit with the final blocks (`m-replay`, Rehearsal record). Counts: stand-in base 2227 tests (`71e5251`'s 2226 + the stand-in guard's 1); after M1 … M11: 2228 … 2238 (+1 per task).

### Inventory (M at `71e5251`)

| # | Form · file | Submit · `<form>` | Today (validation · server errors) | Decision | Task |
|---|---|---|---|---|---|
| 34 | brand `c/master-data/brand-form.tsx` | `handleSubmit :48` · `:86` | native `required` `:93`, `maxLength` `:92` · `throw new Error(result?.error …)` `:64` → `apiError.toast` `:71` | M-R1–M-R5; server 409 duplicate on `name` (S) | M1 |
| 37 | company `c/master-data/company-form.tsx` | `:63` · `:101` | native `required` ×2, `maxLength` ×6 · `:79` → `:86` | same; 409 duplicate on `code` | M1 |
| 38 | department `c/master-data/department-form.tsx` | `:65` · `:103` | native `required` ×2, `maxLength` ×2 · `:81` → `:88` | same; 409 duplicate on `code` | M1 |
| 35 | branch `c/master-data/branch-form.tsx` | `:70` · `:108` | native `required` ×3, `maxLength` ×4 · `:86` → `:93` · **gate** `disabled={companies.length === 0}` `:177`, no reason shown | same; the gate stays with a reason (M-R10); branch-code duplicate on `code` (S, §6.2) | M2 |
| 40 | location `c/master-data/location-form.tsx` | `:85` · `:123` | native `required` ×4, `maxLength` ×3 · `:101` → `:108` · **gate** `disabled={branches.length === 0}` `:214` | same (M-R10); own-parent / cycle on `parentId`, duplicate on `code` (S) | M2 |
| 39 | employee `c/master-data/employee-form.tsx` | `:126` · `:164` | native `required` ×6, `maxLength` ×5, `type="email"` · `:142` → `:149` | same; "own manager" on `managerId`, duplicate on `code` (S) | M3 |
| 42 | supplier `c/master-data/supplier-form.tsx` | `:111` · `:160` | native `required` ×2, `maxLength` ×6 · own state `useState<SupplierFormErrors>` `:63`, `parseSupplierFormError` `:128`, `getErrorMessage` `:104-109`, **validation toast** `toast.error(getErrorMessage(first))` `:133` | onto the hook; the toast, the parser use and three supplier messages go (M-R6) | M4 |
| 36 | category `c/master-data/category-form.tsx` | `:80` · `:118` | native `required` ×4 (`:126,:135,:295,:305`), `maxLength` ×7 · `:96` → `:103` · photo item `:443-450` has no rule on the client (server `min(1)`) | same, with the rows' dotted keys (M-R7); an active duplicate on `code` (S) | M5 |
| 41 | asset model `c/master-data/asset-model-form.tsx` | `:139` · `:236` | native `required` ×3, `maxLength` ×1 · save `:159` → `:166`; photo upload `:190`, delete `:213` keep their toasts | same; duplicate on `name` (S) | M6 |
| 43 | admin user `c/admin/admin-user-form.tsx` | `:86` · `:126` | native `required` ×3 (password only on create), `minLength={8}`, `maxLength` ×4, `type="email"` · `:105` → `:110` · roles `:186-202`: no star, no client rule (server `.min(1)`) | same; one group error (M-R8); username exists, "Password is required" (S) | M7 |
| 44 | role `c/admin/role-permission-form.tsx` | `:101` · `:139` | native `required` ×2, `pattern` `:148`, `maxLength` ×3; server also `min(2) max(50)` on the key · `:119` → `:124` | same; one group error above the table; role name exists, invalid permission selection (S) | M8 |
| 47 | integration create `c/admin/IntegrationClientManager.tsx` | `createClient :216` · `:451` (`className` before `onSubmit`) | native `required`, `minLength={3}`, `maxLength`, `pattern` · **silent rule** last scope cannot be unchecked `:176-184` · `throw new Error(labels.createFailed)` `:226`: **the server's message is thrown away** | same; scopes an error on submit (M-R11); the server's reason described (M-R13) | M9 |
| 48 | integration edit (same file) | `updateEditingClient :242` · `:404` | native `required`, `maxLength` · **silent rule** `:200-208` · **content gate** `disabled={editScopes.length === 0}` `:441` · `throw new Error(labels.actionFailed)` `:256` | same | M9 |
| 49 | asset state review `c/admin/asset-state-review-dialog.tsx` + `asset-state-review-workspace.tsx` | inline `onSubmit` `:55-65` → workspace `submitDialog :105` | native `required`, `minLength={10}`, `maxLength={2000}` · **content gate** `disabled={reason.trim().length < 10}` `:109` · workspace: stale → `toast.error` `:116`, else `apiError.toast` `:117` | reason an error on submit; a refusal goes back to the dialog (M-R9) | M10 |
| 50 | data-quality rules `c/admin/data-quality-rule-form.tsx` | `save :39` (no `<form>`; button in the panel's actions `:62`) | no field a person can get wrong · **bare `catch` → `toast.error(labels.error)`** `:51-52`: the server's message is thrown away | a `<form noValidate>`; `validate()` its one rule; the catch shows the server's reason (M-R12) | M11 |
| 52 | report preset name `c/reports/report-preset-controls.tsx` | `savePreset :53` (no `<form>`, `onClick` `:89`) | `maxLength={60}` `:86` · empty name → `setMessage(labels.presetNameRequired)` in a danger Notice not tied to the field `:61`, `:95` | a `<form noValidate>`; the name error under the field; the Notice stays for the storage failure (M-R12) | M11 |

Not in area M: the settings form (#45) and the prefix editor (#46) (a later plan), and every form of the other domains. `ConfirmTextDialog` and the delete confirms have no field. The workspace's load and scan toasts (`asset-state-review-workspace.tsx:84`, `:99`) are catch toasts, not validation.

### Interfaces with the other areas

| # | From | What area M uses | Where |
|---|---|---|---|
| 1 | F | `useFieldErrors<K>()` and `useValidationMessage()` from `@/components/ui/use-field-errors` with the contract of M-R3 | every task |
| 2 | F | `required`, `minLength`, `maxLength`, `pattern`, `email`, `atLeastOne` from `@/lib/validation-rules`, returning a code or `null`, `null` for an empty value except `required` / `atLeastOne` | every task |
| 3 | F | `common.validation.*` with `tooShort {min}`, `tooLong {max}`; `message(key)` works without params (FIXED 5) | every task |
| 4 | F | `tests/validation-guards.test.ts` with `const V_FORMS` listing `` `${C}<path>` `` rows (`C = "src/components/"`), and its check (noValidate, `validate(`, no `toast.error` / `toast.warning` outside a `catch`); M appends one row per form at the list's end | every task, Step 4 |
| 5 | F | `Field` still takes `id`, `error`, `hint`, `required`, `className`; `FieldError` still exported and takes `id` / `className` (F changes how it announces, not its props); `FieldGroup` from Task 17 (F7) | M7, M8 (`FieldError`); M9 (`FieldGroup`, A-R3) |
| 6 | S | 400 `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors }` with dotted keys and `_form` (FIXED 2) | every task, M10 reads `code` |
| 7 | S | 409 `{ error, code: "DUPLICATE", fieldErrors: { code \| name: "duplicate" } }` on create and update of company, department, employee, location, brand (`name`), model (`name`), category (active duplicate, `code`) | M1–M3, M5, M6 |
| 8 | S | §6.2 non-zod refusals with `fieldErrors`: branch code exists (`code`), own manager (`managerId`), own parent / cycle (`parentId`), username exists (`username`), "Password is required" (`password`), role name exists (`name`), invalid permission selection (`permissionIds`) | M2, M3, M7, M8 |
| 9 | S | supplier's routes on the shared body and codes; Task 7 (S7) keeps `parseSupplierFormError` on the shared codes and rewrites `getErrorMessage`'s three lines; Task 22 (M4) removes both and the parser module (A-R4) | M4 |
| 10 | M | `V_FORMS` holds the 15 files (16 forms) of the inventory after M11 (A-R5) | later plans, the final plan |
| 11 | M | the patterns M-R1–M-R13 for the later plans (assets, operations, audit, disposal, maintenance, settings) | later plans |

What the controller's dev-app check does for this area is in Task 30 (Steps 5–7). A-R8 replaces the draft's duplicate-code check on create: Task 8 answers those duplicates from the database's unique index during the write, so submitting one would be a write attempt.

---

### Task 19 (M1): Brand, company and department show their errors under the field (`c/master-data/brand-form.tsx`, `company-form.tsx`, `department-form.tsx`)

Spec §4.1, §4.3, §4.5, §5 #34, #37, #38. The pattern every later task repeats: M-R1 to M-R5.

**Files:**
- Modify: `src/components/master-data/brand-form.tsx`, `company-form.tsx`, `department-form.tsx` (CRLF)
- Pins: `tests/brand-form-ui.test.ts`, `tests/company-form-ui.test.ts`, `tests/department-form-ui.test.ts` (CRLF), `tests/master-data-sweep-ui.test.ts` (LF)
- Guard: `tests/validation-guards.test.ts` (F's file, `V_FORMS` only)
- Test: `tests/v-track-m.test.ts` (new, LF)

**Changes at 71e5251** (the same rows in all three files unless a row names one):

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports (brand `:14-16`, company `:15-17`, department after `use-api-error`) | `import { useApiError } from "@/components/ui/use-api-error"` | add after it `import { useFieldErrors } from "@/components/ui/use-field-errors"`; add after `import { cn } from "@/lib/utils"` `import { maxLength, required } from "@/lib/validation-rules"` | M-R3 |
| after the empty values (brand `:27`, company `:38`; department before `export function DepartmentForm(`) | — | the table and `validate()` of M-R1 / M-R2 with the comment lines `// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).` and `// noValidate turns the browser's check off, so this restates the controls' required and maxLength (v-track M-R2).`; tables: brand `name: "brand-name"`; company `code: "company-code"`, `assetTagCode: "company-asset-tag-code"`, `nameTh: "company-name-th"`, `nameEn: "company-name-en"`, `taxId: "company-tax-id"`, `address: "company-address"`; department `code: "department-code"`, `name: "department-name"`; rules exactly as the Step 1 test lists them | M-R1, M-R2 |
| `const [saving, setSaving] = useState(false)` | — | add after it `const fieldErrors = useFieldErrors<BrandField>()` (`CompanyField`, `DepartmentField`) | M-R3 |
| before `setField` (company `:59`, department `:61`); brand after `title` `:46` | — | `const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })` | M-R4 |
| `setField` (company `:59-61`, department `:61-63`); brand has none | `setValues((current) => ({ ...current, [field]: value }))` | add the line `if (field in FIELD_IDS) fieldErrors.clear(field as CompanyField)` after it; brand gets the same `setField<K extends keyof BrandFormValues>` and its two `onChange`s call `setField("name", event.target.value)` and `setField("isActive", event.target.checked)` | M-R5 |
| `handleSubmit`, after `event.preventDefault()` | `setSaving(true)` | `fieldErrors.setErrors(validate(values))` / `if (focusFirstError()) return` / `setSaving(true)` | M-R4 |
| the refusal (brand `:63-64`, company `:78-79`, department `:80-81`) | `const result = await response.json().catch(() => null)` / `throw new Error(result?.error ?? tCommon("error"))` | between them: `// A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).` / `if (fieldErrors.applyServer(result) && focusFirstError()) return` | M-R4 |
| `<form …>` (brand `:86`, company `:101`, department `:103`) | `<form onSubmit={handleSubmit} className={cn(getPanelClasses(), "p-4 sm:p-5")}>` | `<form onSubmit={handleSubmit} noValidate className={cn(getPanelClasses(), "p-4 sm:p-5")}>` | FIXED 6 |
| each `<Field>` of a table key | e.g. brand `:88` `<Field label={t("brandName")} required>`, company `:103` `<Field label={t("code")} required hint={t("codeHelp")}>` | `id` after `label`, `error` last (M-R5): `<Field label={t("brandName")} id="brand-name" required error={fieldErrors.message("name")}>`, `<Field label={t("code")} id="company-code" required hint={t("codeHelp")} error={fieldErrors.message("code")}>`, … one per table key | M-R5 |

- [ ] **Step 1: The failing test.** Create `tests/v-track-m.test.ts` (LF) with exactly:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// V track plan 1, area M: the master-data and admin forms show their errors under the field (spec
// docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4, §5, §7). One test per task, appended in order.
// The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const C = "src/components/"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// The body of the module-level `function validate(`, up to the first line that is only "}".
function validateBody(source: string) {
  const start = source.search(/^function validate\(/m)
  assert.notEqual(start, -1, "a module-level function validate(")
  const end = source.indexOf("\n}\n", start)
  return source.slice(start, end)
}

// The shape every migrated form shares (M-R1 to M-R4): noValidate straight after onSubmit, the FIELD_IDS table in
// visual order, validate() with one check per rule, the hook, focus on the first wrong field for the client's errors
// and the server's, each listed key's message under its Field, and no toast for a validation error.
function assertMigratedForm(
  source: string,
  form: { ids: Record<string, string>; handler?: string; messages?: readonly string[]; table?: string; hook?: string; server?: false },
) {
  const handler = form.handler ?? "handleSubmit"
  const table = form.table ?? "FIELD_IDS"
  const hook = form.hook ?? "fieldErrors"
  assert.match(source, new RegExp(`<form onSubmit=\\{${handler}\\} noValidate[ >\\n]`), "noValidate directly after onSubmit")
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
  assert.doesNotMatch(source, /\btoast\.(?:error|warning)\(/, "no validation toast (the catch keeps apiError.toast)")
}

test("brand, company and department: the browser's check is off, validate() restates every rule, and errors show under the field (v-track M1)", () => {
  const brand = read(`${C}master-data/brand-form.tsx`)
  assertMigratedForm(brand, { ids: { name: "brand-name" } })
  assert.match(validateBody(brand), /check\("name", required\(values\.name\) \?\? maxLength\(values\.name, 200\)\)/)

  const company = read(`${C}master-data/company-form.tsx`)
  assertMigratedForm(company, {
    ids: {
      code: "company-code",
      assetTagCode: "company-asset-tag-code",
      nameTh: "company-name-th",
      nameEn: "company-name-en",
      taxId: "company-tax-id",
      address: "company-address",
    },
  })
  const companyRules = validateBody(company)
  for (const rule of [
    'check("code", required(values.code) ?? maxLength(values.code, 20))',
    'check("assetTagCode", maxLength(values.assetTagCode, 20))',
    'check("nameTh", required(values.nameTh) ?? maxLength(values.nameTh, 200))',
    'check("nameEn", maxLength(values.nameEn, 200))',
    'check("taxId", maxLength(values.taxId, 20))',
    'check("address", maxLength(values.address, 500))',
  ]) assert.ok(companyRules.includes(rule), rule)

  const department = read(`${C}master-data/department-form.tsx`)
  assertMigratedForm(department, {
    ids: { code: "department-code", name: "department-name" },
  })
  const departmentRules = validateBody(department)
  for (const rule of [
    'check("code", required(values.code) ?? maxLength(values.code, 20))',
    'check("name", required(values.name) ?? maxLength(values.name, 200))',
  ]) assert.ok(departmentRules.includes(rule), rule)

  // A field's error clears when that field changes (spec §4.3): setField clears the key it sets.
  for (const [name, source] of [["brand", brand], ["company", company], ["department", department]] as const) {
    assert.match(source, /setValues\(\(current\) => \(\{ \.\.\.current, \[field\]: value \}\)\)\n\s+if \(field in FIELD_IDS\) fieldErrors\.clear\(field as \w+Field\)/, name)
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-m.test.ts`. Expected to fail: "brand, company and department: the browser's check is off, validate() restates every rule, and errors show under the field (v-track M1)" ("noValidate directly after onSubmit"). After Step 3 and before Step 4, `node --test tests/brand-form-ui.test.ts tests/company-form-ui.test.ts tests/department-form-ui.test.ts tests/master-data-sweep-ui.test.ts` fails four tests: "the brand form uses the shared field and a busy save button (2C batch 2)", "the company form uses the shared fields with hints and a busy save button (2C batch 2)", "the department form uses the shared fields, checkbox and buttons (2C batch 2)" and "the seven simple master-data forms: a <form> cannot be ContentPanel, so it takes the panel classes and the one panel spacing (spec 2D D9, 2D-2 R4)" ("brand"). That is expected; Step 4 is their edit.
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin and guard edits** (exact old → new; each old string occurs once in its file):
  - `tests/brand-form-ui.test.ts:13`, old `/<Field label=\{t\("brandName"\)\} required>\n` → new `/<Field label=\{t\("brandName"\)\} id="brand-name" required error=\{fieldErrors\.message\("name"\)\}>\n` (the rest of the line as it is).
  - `tests/company-form-ui.test.ts:12`, old `/<Field label=\{t\("code"\)\} required hint=\{t\("codeHelp"\)\}>\n` → new `/<Field label=\{t\("code"\)\} id="company-code" required hint=\{t\("codeHelp"\)\} error=\{fieldErrors\.message\("code"\)\}>\n`; `:13`, old `/<Field label=\{t\("assetTagCode"\)\} hint=\{t\("assetTagCodeHelp"\)\}>\n` → new `/<Field label=\{t\("assetTagCode"\)\} id="company-asset-tag-code" hint=\{t\("assetTagCodeHelp"\)\} error=\{fieldErrors\.message\("assetTagCode"\)\}>\n`.
  - `tests/department-form-ui.test.ts:11`, old `/<Field label=\{t\("code"\)\} required>\n` → new `/<Field label=\{t\("code"\)\} id="department-code" required error=\{fieldErrors\.message\("code"\)\}>\n`; `:12`, old `/<Field label=\{t\("name"\)\} required>\n` → new `/<Field label=\{t\("name"\)\} id="department-name" required error=\{fieldErrors\.message\("name"\)\}>\n`.
  - `tests/master-data-sweep-ui.test.ts:127`, old: `    assert.match(source, /<form onSubmit=\{handleSubmit\} className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/, name)` → new, two lines: `    // noValidate comes in form by form (v-track plan 1, M1 to M4); M4 makes it required for all seven.` / `    assert.match(source, /<form onSubmit=\{handleSubmit\}(?: noValidate)? className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/, name)`.
  - `tests/validation-guards.test.ts` (A-R5), old `const V_FORMS: readonly string[] = []` → new, five lines: `const V_FORMS: readonly string[] = [` / `` `${C}master-data/brand-form.tsx`, `` / `` `${C}master-data/company-form.tsx`, `` / `` `${C}master-data/department-form.tsx`, `` / `]` (each row indented two spaces). Every later task inserts its rows directly before that `]`.
- [ ] **Step 5: Verify.** `node --test tests/v-track-m.test.ts tests/brand-form-ui.test.ts tests/company-form-ui.test.ts tests/department-form-ui.test.ts tests/master-data-sweep-ui.test.ts tests/master-data-return-navigation.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/visual-foundation-guards.test.ts`; `npm test` (2246 tests, 2245 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`). `node <tools>/eol.mjs src/components/master-data/brand-form.tsx src/components/master-data/company-form.tsx src/components/master-data/department-form.tsx tests/v-track-m.test.ts` prints `150 150`, `217 217`, `189 189` and `0 92`.
- [ ] **Step 6: Commit.** `git add src/components/master-data/brand-form.tsx src/components/master-data/company-form.tsx src/components/master-data/department-form.tsx tests/brand-form-ui.test.ts tests/company-form-ui.test.ts tests/department-form-ui.test.ts tests/master-data-sweep-ui.test.ts tests/validation-guards.test.ts tests/v-track-m.test.ts`, then `git commit -m "feat(master-data): brand, company and department show their errors under the field (v-track plan 1 task 19, M1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 20 (M2): Branch and location show their errors under the field, and say why save waits for a company or a branch (`c/master-data/branch-form.tsx`, `location-form.tsx`, messages)

Spec §4.4 (a prerequisite keeps its gate and always says why; `aria-disabled` plus a reason, §11 call 2), §5 #35, #40. M1's pattern, plus M-R10.

**Files:**
- Modify: `src/components/master-data/branch-form.tsx`, `location-form.tsx` (CRLF); `messages/th.json`, `messages/en.json` (CRLF, through `scripts/messages-edit.mjs`)
- Pins: `tests/branch-form-ui.test.ts`, `tests/location-form-ui.test.ts` (CRLF)
- Guard: `tests/validation-guards.test.ts`
- Test: `tests/v-track-m.test.ts` (LF)

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports, tables, `validate()`, hook, `focusFirstError`, `setField`, refusal, `<form>` (branch `:108`, location `:123`) | as M1 | as M1. Tables: branch `code: "branch-code"`, `name: "branch-name"`, `companyId: "branch-company"`, `contactPerson: "branch-contact-person"`, `address: "branch-address"`; location `code: "location-code"`, `name: "location-name"`, `branchId: "location-branch"`, `locationType: "location-type"`, `parentId: "location-parent"`, `description: "location-description"`; rules as the Step 1 test lists them | M-R1–M-R5 |
| before `focusFirstError` | — | branch `const needsCompany = companies.length === 0`; location `const needsBranch = branches.length === 0` | M-R10 |
| `handleSubmit` | `event.preventDefault()` / `setSaving(true)` | `event.preventDefault()` / `if (needsCompany) return` (location `needsBranch`) / `fieldErrors.setErrors(validate(values))` / `if (focusFirstError()) return` / `setSaving(true)` | M-R10, M-R4 |
| each `<Field>` of a table key | e.g. `<Field label={t("company")} required>` | e.g. `<Field label={t("company")} id="branch-company" required error={fieldErrors.message("companyId")}>`; location's type `<Field label={t("locationType")} id="location-type" required error={fieldErrors.message("locationType")}>`, parent `<Field label={t("parentLocation")} id="location-parent" error={fieldErrors.message("parentId")}>` | M-R5 |
| the footer (branch `:173`, location `:210`) | `<div className="mt-6 flex justify-end gap-3 border-t border-border pt-5">` | `<div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-border pt-5">`, and its first child `{needsCompany ? <p id="branch-save-reason" className="basis-full text-meta text-muted-foreground sm:mr-auto sm:basis-auto sm:self-center">{t("saveNeedsCompany")}</p> : null}` (location: `needsBranch`, `location-save-reason`, `saveNeedsBranch`) | M-R10 |
| branch `:177`, location `:214` | `<Button type="submit" busy={saving} disabled={companies.length === 0}>` | `<Button type="submit" busy={saving} aria-disabled={needsCompany \|\| undefined} aria-describedby={needsCompany ? "branch-save-reason" : undefined}>` (location: `needsBranch`, `"location-save-reason"`) | M-R10 |
| messages | — | change file `<temp>/m2-messages.json`: `{"set":{"th":{"branch.saveNeedsCompany":"ยังไม่มีบริษัท ต้องเพิ่มบริษัทก่อนจึงจะบันทึกสาขาได้","location.saveNeedsBranch":"ยังไม่มีสาขา ต้องเพิ่มสาขาก่อนจึงจะบันทึกที่ตั้งได้"},"en":{"branch.saveNeedsCompany":"No company yet. Add a company before you save a branch.","location.saveNeedsBranch":"No branch yet. Add a branch before you save a location."}}}`, then `node scripts/messages-edit.mjs <temp>/m2-messages.json` | M-R10 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-m.test.ts`:

```ts

test("branch and location: errors under the field, and the no-company or no-branch gate keeps focus and says why beside the button (v-track M2)", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  const forms = [
    {
      path: `${C}master-data/branch-form.tsx`,
      ids: { code: "branch-code", name: "branch-name", companyId: "branch-company", contactPerson: "branch-contact-person", address: "branch-address" },
      rules: [
        'check("code", required(values.code) ?? maxLength(values.code, 20))',
        'check("name", required(values.name) ?? maxLength(values.name, 200))',
        'check("companyId", required(values.companyId))',
        'check("contactPerson", maxLength(values.contactPerson, 200))',
        'check("address", maxLength(values.address, 500))',
      ],
      gate: "needsCompany",
      options: "companies",
      reason: "branch-save-reason",
      message: ["branch", "saveNeedsCompany"],
    },
    {
      path: `${C}master-data/location-form.tsx`,
      ids: { code: "location-code", name: "location-name", branchId: "location-branch", locationType: "location-type", parentId: "location-parent", description: "location-description" },
      rules: [
        'check("code", required(values.code) ?? maxLength(values.code, 50))',
        'check("name", required(values.name) ?? maxLength(values.name, 200))',
        'check("branchId", required(values.branchId))',
        'check("locationType", required(values.locationType))',
        'check("description", maxLength(values.description, 500))',
      ],
      gate: "needsBranch",
      options: "branches",
      reason: "location-save-reason",
      message: ["location", "saveNeedsBranch"],
    },
  ] as const
  for (const form of forms) {
    const source = read(form.path)
    assertMigratedForm(source, { ids: form.ids })
    const rules = validateBody(source)
    for (const rule of form.rules) assert.ok(rules.includes(rule), `${form.path}: ${rule}`)
    // A prerequisite, not a field (spec §4.4): the gate stays, the reason shows next to the button, and the button stays
    // focusable (aria-disabled, tied to the reason) instead of disabled.
    assert.match(source, new RegExp(`const ${form.gate} = ${form.options}\\.length === 0\\n`))
    assert.match(source, new RegExp(`event\\.preventDefault\\(\\)\\n\\s+if \\(${form.gate}\\) return\\n`))
    assert.ok(source.includes(`{${form.gate} ? <p id="${form.reason}" className="basis-full text-meta text-muted-foreground sm:mr-auto sm:basis-auto sm:self-center">{t("${form.message[1]}")}</p> : null}`), form.reason)
    assert.ok(source.includes(`<Button type="submit" busy={saving} aria-disabled={${form.gate} || undefined} aria-describedby={${form.gate} ? "${form.reason}" : undefined}>`), `${form.path}: the gated button`)
    assert.match(source, /<div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-border pt-5">/)
    assert.doesNotMatch(source, /(?<![\w-])disabled=\{/, "no disabled attribute")
    assert.equal(typeof th[form.message[0]][form.message[1]], "string", `th ${form.message.join(".")}`)
    assert.equal(typeof en[form.message[0]][form.message[1]], "string", `en ${form.message.join(".")}`)
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-m.test.ts`. Expected to fail: "branch and location: errors under the field, and the no-company or no-branch gate keeps focus and says why beside the button (v-track M2)" ("noValidate directly after onSubmit"). After Step 3 and before Step 4, `node --test tests/branch-form-ui.test.ts tests/location-form-ui.test.ts` fails "the branch form uses the shared fields and a busy save button that still waits for a company (2C batch 2)" and "the location form uses the shared fields and a busy save button that still waits for a branch (2C batch 2)" (the starred Field counts); Step 4 is their edit.
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin and guard edits:**
  - `tests/branch-form-ui.test.ts:13`, old `/<Field label=\{t\("(?:code|name|company)"\)\} required>/g` → new `/<Field label=\{t\("(?:code|name|company)"\)\} id="branch-[\w-]+" required error=\{fieldErrors\.message\("\w+"\)\}>/g`; `:18`, old `  assert.match(source, /<Button type="submit" busy=\{saving\} disabled=\{companies\.length === 0\}>\n` → new, two lines: `  // The gate stays without a company, focusable with its reason (v-track plan 1 M2).` / `  assert.match(source, /<Button type="submit" busy=\{saving\} aria-disabled=\{needsCompany \|\| undefined\} aria-describedby=\{needsCompany \? "branch-save-reason" : undefined\}>\n` (the rest of the line as it is).
  - `tests/location-form-ui.test.ts:13`, old `/<Field label=\{t\("(?:code|name|branch|locationType)"\)\} required>/g` → new `/<Field label=\{t\("(?:code|name|branch|locationType)"\)\} id="location-[\w-]+" required error=\{fieldErrors\.message\("\w+"\)\}>/g`; `:18`, old `  assert.match(source, /<Button type="submit" busy=\{saving\} disabled=\{branches\.length === 0\}>\n` → new, two lines: `  // The gate stays without a branch, focusable with its reason (v-track plan 1 M2).` / `  assert.match(source, /<Button type="submit" busy=\{saving\} aria-disabled=\{needsBranch \|\| undefined\} aria-describedby=\{needsBranch \? "location-save-reason" : undefined\}>\n`.
  - `V_FORMS`: append `` `${C}master-data/branch-form.tsx`, `` and `` `${C}master-data/location-form.tsx`, ``.
- [ ] **Step 5: Verify.** `node --test tests/v-track-m.test.ts tests/branch-form-ui.test.ts tests/location-form-ui.test.ts tests/master-data-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/visual-foundation-guards.test.ts tests/design-system.test.ts`; `npm test` (2247 tests, 2246 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npm run lint`. Messages +2 keys (4093). `node <tools>/eol.mjs src/components/master-data/branch-form.tsx src/components/master-data/location-form.tsx tests/v-track-m.test.ts` prints `223 223`, `261 261`, `0 145`.
- [ ] **Step 6: Commit.** `git add src/components/master-data/branch-form.tsx src/components/master-data/location-form.tsx tests/branch-form-ui.test.ts tests/location-form-ui.test.ts tests/validation-guards.test.ts tests/v-track-m.test.ts messages/th.json messages/en.json`, then `git commit -m "feat(master-data): branch and location show their errors under the field and say why save waits for a company or a branch (v-track plan 1 task 20, M2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 21 (M3): The employee form shows its errors under the field (`c/master-data/employee-form.tsx`)

Spec §4.3 (a group clears together), §5 #39, §6.2 ("employee is their own manager" lands under the manager). M1's pattern.

**Files:** Modify `src/components/master-data/employee-form.tsx` (CRLF) · Pins `tests/employee-form-ui.test.ts` (CRLF) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track-m.test.ts` (LF).

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports `:15-17` | as M1 | as M1, with `import { email, maxLength, required } from "@/lib/validation-rules"` | M-R3 |
| after `emptyEmployee` `:72` | — | table `code: "employee-code"`, `fullNameTh: "employee-full-name-th"`, `fullNameEn: "employee-full-name-en"`, `email: "employee-email"`, `companyId: "employee-company"`, `branchId: "employee-branch"`, `departmentId: "employee-department"`, `position: "employee-position"`, `employmentStatus: "employee-employment-status"`, `managerId: "employee-manager"`; `validate()` as the Step 1 test lists; its comment says `required, maxLength and type="email"` | M-R1, M-R2 |
| `setField :105-107`, `handleSubmit :126-128`, refusal `:141-142`, `<form>` `:164` | as M1 | as M1 | M-R4 |
| `handleCompanyChange :109-124` | ends `}))` / `}` | `fieldErrors.clear("companyId", "branchId", "departmentId")` after `}))` | M-R5 |
| the ten `<Field>`s `:166-268` | e.g. `<Field label={t("manager")}>` | e.g. `<Field label={t("manager")} id="employee-manager" error={fieldErrors.message("managerId")}>`; one per table key, required ones keep `required` before `error` | M-R5 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-m.test.ts`:

```ts

test("employee: errors under the field, the email rule, and a company change clears the branch and department errors with it (v-track M3)", () => {
  const source = read(`${C}master-data/employee-form.tsx`)
  assertMigratedForm(source, {
    ids: {
      code: "employee-code",
      fullNameTh: "employee-full-name-th",
      fullNameEn: "employee-full-name-en",
      email: "employee-email",
      companyId: "employee-company",
      branchId: "employee-branch",
      departmentId: "employee-department",
      position: "employee-position",
      employmentStatus: "employee-employment-status",
      managerId: "employee-manager",
    },
  })
  const rules = validateBody(source)
  for (const rule of [
    'check("code", required(values.code) ?? maxLength(values.code, 20))',
    'check("fullNameTh", required(values.fullNameTh) ?? maxLength(values.fullNameTh, 200))',
    'check("fullNameEn", maxLength(values.fullNameEn, 200))',
    'check("email", email(values.email) ?? maxLength(values.email, 200))',
    'check("companyId", required(values.companyId))',
    'check("branchId", required(values.branchId))',
    'check("departmentId", required(values.departmentId))',
    'check("position", maxLength(values.position, 200))',
    'check("employmentStatus", required(values.employmentStatus))',
  ]) assert.ok(rules.includes(rule), rule)
  // The company narrows the branch and department lists, so changing it clears the three together (spec §4.3).
  assert.match(source, /function handleCompanyChange\(companyId: string\) \{\n[\s\S]*?\n    \}\)\)\n    fieldErrors\.clear\("companyId", "branchId", "departmentId"\)\n  \}/)
  // "Employee cannot be their own manager" answers with fieldErrors.managerId (area S), shown under the manager field.
  assert.match(source, /<Field label=\{t\("manager"\)\} id="employee-manager" error=\{fieldErrors\.message\("managerId"\)\}>/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-m.test.ts`. Expected to fail: "employee: errors under the field, the email rule, and a company change clears the branch and department errors with it (v-track M3)". After Step 3 and before Step 4, `node --test tests/employee-form-ui.test.ts` fails "the employee form uses the shared fields, checkbox and buttons (2C batch 2)" and "the employee form still narrows branch and department to the chosen company"; Step 4 is their edit.
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin and guard edits:**
  - `tests/employee-form-ui.test.ts:11-12`, old: `  assert.equal(source.match(/<Field label=\{t\("\w+"\)\} required>/g)?.length, 6)` / `  assert.equal(source.match(/<Field label=\{t\("\w+"\)\}>/g)?.length, 4)` → new, three lines: `  // Each Field names its control (employee-…) and shows its error (v-track plan 1 M3).` / `  assert.equal(source.match(/<Field label=\{t\("\w+"\)\} id="employee-[\w-]+" required error=\{fieldErrors\.message\("\w+"\)\}>/g)?.length, 6)` / `  assert.equal(source.match(/<Field label=\{t\("\w+"\)\} id="employee-[\w-]+" error=\{fieldErrors\.message\("\w+"\)\}>/g)?.length, 4)`.
  - `:22`, old `/<Field label=\{t\("company"\)\} required>\n` → new `/<Field label=\{t\("company"\)\} id="employee-company" required error=\{fieldErrors\.message\("companyId"\)\}>\n`; `:23`, old `/<Field label=\{t\("branch"\)\} required>\n` → new `/<Field label=\{t\("branch"\)\} id="employee-branch" required error=\{fieldErrors\.message\("branchId"\)\}>\n`; `:24`, old `/<Field label=\{t\("department"\)\} required>\n` → new `/<Field label=\{t\("department"\)\} id="employee-department" required error=\{fieldErrors\.message\("departmentId"\)\}>\n`.
  - `V_FORMS`: append `` `${C}master-data/employee-form.tsx`, ``.
- [ ] **Step 5: Verify.** `node --test tests/v-track-m.test.ts tests/employee-form-ui.test.ts tests/master-data-sweep-ui.test.ts tests/master-data-return-navigation.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts`; `npm test` (2248 tests, 2247 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npm run lint`. eol: `350 350` (the form), `0 179`.
- [ ] **Step 6: Commit.** `git add src/components/master-data/employee-form.tsx tests/employee-form-ui.test.ts tests/validation-guards.test.ts tests/v-track-m.test.ts`, then `git commit -m "feat(master-data): the employee form shows its errors under the field (v-track plan 1 task 21, M3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 22 (M4): The supplier form moves onto the shared field errors and drops its validation toast (`c/master-data/supplier-form.tsx`, messages)

Spec §6.1 (supplier onto the shared body and codes), U2 (no validation toast), §5 #42; M-R6. The seven simple master-data forms now all carry `noValidate`, so the sweep pin tightens.

**Files:** Modify `src/components/master-data/supplier-form.tsx` (CRLF), `messages/th.json`, `messages/en.json` · Pins `tests/supplier-form-ui.test.ts` (CRLF), `tests/master-data-sweep-ui.test.ts` (LF) · Delete `src/lib/supplier-form-errors.ts`, `tests/supplier-form-errors.test.ts` (Step 3, A-R4) · Pin `tests/v-track-s.test.ts` (LF; the end of Task 7's test, A-R4) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track-m.test.ts` (LF).

**Changes at 71e5251** (Task 7 (S7) rewrote the three `if (code === …)` lines of `getErrorMessage` in place; the function goes as a whole, and every other line is as at `71e5251`):

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:9-14` | `import { parseSupplierFormError, type SupplierFormErrorCode, type SupplierFormErrors, type SupplierFormField } from "@/lib/supplier-form-errors"` | gone | M-R6 |
| imports `:23-25` | as M1 | as M1, with `email, maxLength, required` | M-R3 |
| after `emptySupplier :46` | — | table `code: "supplier-code"`, `name: "supplier-name"`, `contactPerson: "supplier-contact"`, `phone: "supplier-phone"`, `email: "supplier-email"`, `address: "supplier-address"`; `validate()` as the Step 1 test lists | M-R1, M-R2 |
| `:63` | `const [fieldErrors, setFieldErrors] = useState<SupplierFormErrors>({})` | `const fieldErrors = useFieldErrors<SupplierField>()` | M-R6 |
| after `title :70` | — | `focusFirstError` as M1 | M-R4 |
| `setField :84-92` | the `setFieldErrors((current) => { … })` block | `if (field in FIELD_IDS) fieldErrors.clear(field as SupplierField)` | M-R5 |
| `getErrorMessage :104-109` | the function | gone | M-R6 |
| `handleSubmit :112-114` | `event.preventDefault()` / `setSaving(true)` / `setFieldErrors({})` | `event.preventDefault()` / `fieldErrors.setErrors(validate(values))` / `if (focusFirstError()) return` / `setSaving(true)` | M-R4 |
| refusal `:127-137` | `parseSupplierFormError(result)`, `setFieldErrors(parsed.fieldErrors)`, `toast.error(getErrorMessage(firstFieldError))`, `throw new Error(parsed.message ?? tCommon("error"))` | M1's two lines, then `throw new Error(result?.error ?? tCommon("error"))` | M-R4, U2 |
| `<form>` `:160` | as M1 | as M1 | FIXED 6 |
| the six `error=` (`:162,:172,:182,:191,:202,:223`) | `error={fieldErrors.code ? getErrorMessage(fieldErrors.code) : undefined}` | `error={fieldErrors.message("code")}` (each its key) | M-R4 |
| messages | `supplier.duplicateCode`, `supplier.invalidEmail`, `supplier.fieldTooLong` | change file `<temp>/m4-messages.json`: `{"delete":["supplier.duplicateCode","supplier.invalidEmail","supplier.fieldTooLong"]}` | M-R6 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-m.test.ts`:

```ts

test("supplier: on the shared hook, codes and messages like the other forms, with no toast for a refused field (v-track M4)", () => {
  const source = read(`${C}master-data/supplier-form.tsx`)
  // The ids stay as they were (the supplier test pins them); the keys are the server's.
  assertMigratedForm(source, {
    ids: {
      code: "supplier-code",
      name: "supplier-name",
      contactPerson: "supplier-contact",
      phone: "supplier-phone",
      email: "supplier-email",
      address: "supplier-address",
    },
  })
  const rules = validateBody(source)
  for (const rule of [
    'check("code", required(values.code) ?? maxLength(values.code, 20))',
    'check("name", required(values.name) ?? maxLength(values.name, 200))',
    'check("contactPerson", maxLength(values.contactPerson, 200))',
    'check("phone", maxLength(values.phone, 50))',
    'check("email", email(values.email) ?? maxLength(values.email, 200))',
    'check("address", maxLength(values.address, 500))',
  ]) assert.ok(rules.includes(rule), rule)
  assert.doesNotMatch(source, /parseSupplierFormError|getErrorMessage|supplier-form-errors|SupplierForm(?:Errors|ErrorCode|Field)\b/)
  // The supplier-only texts gave way to common.validation (M-R6).
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
    for (const key of ["duplicateCode", "invalidEmail", "fieldTooLong"]) assert.equal(messages.supplier[key], undefined, `${locale} supplier.${key}`)
  }
  // All seven simple master-data forms now carry noValidate (M1 to M4).
  for (const name of ["branch", "brand", "company", "department", "employee", "location", "supplier"]) {
    assert.match(read(`${C}master-data/${name}-form.tsx`), /<form onSubmit=\{handleSubmit\} noValidate className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/, name)
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-m.test.ts`. Expected to fail: "supplier: on the shared hook, codes and messages like the other forms, with no toast for a refused field (v-track M4)". After Step 3 and before Step 4, `node --test tests/supplier-form-ui.test.ts` fails "supplier form presents associated inline errors" and "supplier form localization keys stay aligned"; Step 4 is their edit.
- [ ] **Step 3: Implement** per the Changes table, and run the messages change file. Then `git grep -l "supplier-form-errors" -- src tests` prints only `tests/supplier-form-errors.test.ts`, `tests/v-track-m.test.ts` (this task's `doesNotMatch`) and `tests/v-track-s.test.ts` (Task 7 deleted `src/lib/supplier-api-error.ts`; if it prints a `src` file, stop and report), and `git rm src/lib/supplier-form-errors.ts tests/supplier-form-errors.test.ts` (M-R6, A-R4; its 2 tests go). Step 4 cuts the `tests/v-track-s.test.ts` lines.
- [ ] **Step 4: Pin and guard edits:**
  - `tests/supplier-form-ui.test.ts:17`, old `  assert.match(source, /parseSupplierFormError/)` → new, two lines: `  // The shared hook reads the server's fieldErrors and shows the shared messages (v-track plan 1 M4).` / `  assert.match(source, /const fieldErrors = useFieldErrors<SupplierField>\(\)/)`.
  - `:24`, old `  assert.equal(source.match(/error=\{fieldErrors\.\w+ \? getErrorMessage\(fieldErrors\.\w+\) : undefined\}/g)?.length, 6)` → new `  assert.equal(source.match(/error=\{fieldErrors\.message\("\w+"\)\}/g)?.length, 6)`.
  - `:40`, old `  const keys = ["unsavedChangesConfirm", "duplicateCode", "invalidEmail", "fieldTooLong"]` → new `  const keys = ["unsavedChangesConfirm"]`.
  - `tests/master-data-sweep-ui.test.ts`, M1's two lines, old: `    // noValidate comes in form by form (v-track plan 1, M1 to M4); M4 makes it required for all seven.` / `    assert.match(source, /<form onSubmit=\{handleSubmit\}(?: noValidate)? className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/, name)` → new: `    // noValidate straight after onSubmit: the form validates itself (v-track plan 1, M1 to M4).` / `    assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/, name)`.
  - `tests/v-track-s.test.ts` (Task 7's test "supplier answers with the shared body and codes: …"; A-R4, S-R10), with a file tool (the old lines hold regex backslashes), old (exact, six lines):

```ts
  // The supplier-only body and its snake codes are gone; the supplier form reads the shared codes until it moves to the hook.
  assert.equal(existsSync("src/lib/supplier-api-error.ts"), false)
  const { parseSupplierFormError } = await load<typeof import("../src/lib/supplier-form-errors.ts")>("src/lib/supplier-form-errors.ts")
  assert.deepEqual(parseSupplierFormError({ error: "Invalid request data", fieldErrors: { code: "duplicate", email: "invalidEmail", phone: "tooLong", name: "required" } }).fieldErrors, { code: "duplicate", name: "required", phone: "tooLong", email: "invalidEmail" })
  const form = read("src/components/master-data/supplier-form.tsx")
  assert.match(form, /if \(code === "duplicate"\) return t\("duplicateCode"\)\n    if \(code === "invalidEmail"\) return t\("invalidEmail"\)\n    if \(code === "tooLong"\) return t\("fieldTooLong"\)/)
```

    new (exact, three lines):

```ts
  // The supplier-only body and parser are gone: the supplier form reads the shared codes through useFieldErrors (v-track M4).
  assert.equal(existsSync("src/lib/supplier-api-error.ts"), false)
  assert.equal(existsSync("src/lib/supplier-form-errors.ts"), false)
```

    Without it `tsc` fails (the type import of the deleted module) and so does that test (`getErrorMessage` is gone).
  - `V_FORMS`: append `` `${C}master-data/supplier-form.tsx`, ``.
- [ ] **Step 5: Verify.** `node --test tests/v-track-m.test.ts tests/v-track-s.test.ts tests/supplier-form-ui.test.ts tests/master-data-sweep-ui.test.ts tests/form-frames-ui.test.ts tests/confirm-dialog-ui.test.ts tests/ui-overlay-guards.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts`; `npm test` (2247 tests, 2246 pass, 0 fail, 1 skipped; +1, −2: the deleted `tests/supplier-form-errors.test.ts`); `npx tsc --noEmit`; `npm run lint`. Messages −3 keys (4090). eol: `254 254`, `0 213`; `tests/v-track-s.test.ts` `0 478` (481 − 3).
- [ ] **Step 6: Commit.** `git add src/components/master-data/supplier-form.tsx tests/supplier-form-ui.test.ts tests/master-data-sweep-ui.test.ts tests/validation-guards.test.ts tests/v-track-m.test.ts tests/v-track-s.test.ts messages/th.json messages/en.json` (the `git rm` of Step 3 is already staged), then `git commit -m "feat(master-data): the supplier form moves onto the shared field errors and drops its validation toast (v-track plan 1 task 22, M4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 23 (M5): The category form shows its errors under the field, also on each template row (`c/master-data/category-form.tsx`)

Spec §6.1 (dotted keys `customFieldDefs.0.fieldName`), §4.3, §5 #36; M-R7.

**Files:** Modify `src/components/master-data/category-form.tsx` (CRLF) · Pins `tests/category-form-ui.test.ts` (CRLF) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track-m.test.ts` (LF).

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports after `use-api-error` `:23` | — | `import { useFieldErrors } from "@/components/ui/use-field-errors"`, `import { maxLength, required } from "@/lib/validation-rules"` | M-R3 |
| after `emptyCategory :44` | — | `FIELD_IDS` (`code: "category-code"`, `name: "category-name"`, `description: "category-description"`); `const CUSTOM_FIELD_ID_SUFFIX = { fieldName: "name", fieldLabel: "label", fieldLabelTh: "label-th" } as const` and `type CustomFieldErrorField = keyof typeof CUSTOM_FIELD_ID_SUFFIX`; `function fieldOrder(values: CategoryFormValues)` (the three keys, then `customFieldDefs.<i>.<field>` for each row and field of the suffix table, then `photoChecklist.<i>`); `function fieldId(key: string)` (`customFieldDefs.<i>.<field>` → `` `category-field-${i}-${suffix}` ``, `photoChecklist.<i>` → `` `category-photo-${i}` ``, else `FIELD_IDS[key]`); `validate()` as the Step 1 test lists, typed `Partial<Record<string, string>>` | M-R7 |
| `:59` | `const [saving, setSaving] = useState(false)` | add `const fieldErrors = useFieldErrors<string>()` | M-R3 |
| before `setField :65` | — | `const focusFirstError = () => fieldErrors.focusFirst(fieldOrder(values), { idFor: fieldId })`; `setField` clears `field` when `field in FIELD_IDS`; `function clearRowErrors(prefix: "customFieldDefs." \| "photoChecklist.")` clears every key of `fieldErrors.errors` that starts with it | M-R7 |
| `handleSubmit`, refusal, `<form>` `:118` | as M1 (`<form onSubmit={handleSubmit} className="space-y-5">`) | as M1 (`<form onSubmit={handleSubmit} noValidate className="space-y-5">`) | M-R4 |
| the three fixed `<Field>`s `:121-147` | `<Field label={t("code")} required>` … | `<Field label={t("code")} id="category-code" required error={fieldErrors.message("code")}>`, name, description likewise | M-R5 |
| `<CustomFieldTemplateEditor … onChange={setCustomFields} />` `:175-196` | — | three props: `` errorFor={(index, field) => fieldErrors.message(`customFieldDefs.${index}.${field}`)} ``, `` onFieldEdit={(index, field) => fieldErrors.clear(`customFieldDefs.${index}.${field}`)} ``, `onRowsShift={() => clearRowErrors("customFieldDefs.")}` | M-R7 |
| `<PhotoChecklistEditor … />` `:209-220` | — | `` errorFor={(index) => fieldErrors.message(`photoChecklist.${index}`)} ``, `` onItemEdit={(index) => fieldErrors.clear(`photoChecklist.${index}`)} ``, `onRowsShift={() => clearRowErrors("photoChecklist.")}` | M-R7 |
| `CustomFieldTemplateEditor` `:237-279` | props `fields, labels, onChange` | + `errorFor: (index: number, field: CustomFieldErrorField) => string \| undefined`, `onFieldEdit: (index: number, field: CustomFieldErrorField) => void`, `onRowsShift: () => void`; `updateField` calls `if (field in CUSTOM_FIELD_ID_SUFFIX) onFieldEdit(index, field as CustomFieldErrorField)` after `onChange`; `removeField`, `duplicateField`, `moveField` call `onRowsShift()` after `onChange` | M-R7 |
| its three `<Field>`s `:290`, `:300`, `:310` | `<Field label={labels.fieldName} required>` … | `` <Field label={labels.fieldName} id={`category-field-${index}-name`} required error={errorFor(index, "fieldName")}> `` and the label / Thai label ones as the Step 1 test spells them | M-R7 |
| `PhotoChecklistEditor` `:401-433` | props `items, labels, onChange` | + `errorFor: (index: number) => string \| undefined`, `onItemEdit: (index: number) => void`, `onRowsShift: () => void`; `updateItem` calls `onItemEdit(index)`; remove / duplicate / move call `onRowsShift()` | M-R7 |
| `:443` | `<Field label={labels.item} hideLabel>` | `` <Field label={labels.item} hideLabel id={`category-photo-${index}`} error={errorFor(index)}> `` | M-R7 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-m.test.ts`:

```ts

test("category: errors under the field, also on each custom field and photo checklist row, keyed like the server's dotted paths (v-track M5)", () => {
  const source = read(`${C}master-data/category-form.tsx`)
  assertMigratedForm(source, { ids: { code: "category-code", name: "category-name", description: "category-description" } })
  const rules = validateBody(source)
  for (const rule of [
    'check("code", required(values.code) ?? maxLength(values.code, 20))',
    'check("name", required(values.name) ?? maxLength(values.name, 200))',
    'check("description", maxLength(values.description, 500))',
    "check(`customFieldDefs.${index}.fieldName`, required(field.fieldName) ?? maxLength(field.fieldName, 100))",
    "check(`customFieldDefs.${index}.fieldLabel`, required(field.fieldLabel) ?? maxLength(field.fieldLabel, 200))",
    "check(`customFieldDefs.${index}.fieldLabelTh`, maxLength(field.fieldLabelTh, 200))",
    "check(`photoChecklist.${index}`, required(item) ?? maxLength(item, 100))",
  ]) assert.ok(rules.includes(rule), rule)
  // The rows' ids and focus order follow the server's keys (spec §6.1: customFieldDefs.0.fieldName).
  assert.ok(source.includes("const CUSTOM_FIELD_ID_SUFFIX = { fieldName: \"name\", fieldLabel: \"label\", fieldLabelTh: \"label-th\" } as const"))
  assert.ok(source.includes("const focusFirstError = () => fieldErrors.focusFirst(fieldOrder(values), { idFor: fieldId })"))
  for (const field of [
    '<Field label={labels.fieldName} id={`category-field-${index}-name`} required error={errorFor(index, "fieldName")}>',
    '<Field label={labels.fieldLabel} id={`category-field-${index}-label`} required error={errorFor(index, "fieldLabel")}>',
    '<Field label={labels.fieldLabelTh} id={`category-field-${index}-label-th`} error={errorFor(index, "fieldLabelTh")}>',
    "<Field label={labels.item} hideLabel id={`category-photo-${index}`} error={errorFor(index)}>",
  ]) assert.ok(source.includes(field), field)
  // A row's error clears when that row's field changes; removing, copying or moving a row clears that template's errors.
  assert.match(source, /if \(field in CUSTOM_FIELD_ID_SUFFIX\) onFieldEdit\(index, field as CustomFieldErrorField\)/)
  assert.equal(source.match(/\n    onRowsShift\(\)\n/g)?.length, 6, "remove, duplicate and move in each editor")
  assert.ok(source.includes('onRowsShift={() => clearRowErrors("customFieldDefs.")}'))
  assert.ok(source.includes('onRowsShift={() => clearRowErrors("photoChecklist.")}'))
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-m.test.ts`. Expected to fail: "category: errors under the field, also on each custom field and photo checklist row, keyed like the server's dotted paths (v-track M5)". After Step 3 and before Step 4, `node --test tests/category-form-ui.test.ts` fails "the template editors keep their move limits and use the shared button looks (2C batch 2)" (its `:27` photo item Field); Step 4 is its edit.
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin and guard edits:**
  - `tests/category-form-ui.test.ts:27`, old ``/<Field label=\{labels\.item\} hideLabel>\n`` → new ``/<Field label=\{labels\.item\} hideLabel id=\{`category-photo-\$\{index\}`\} error=\{errorFor\(index\)\}>\n`` (the rest of the line as it is).
  - `V_FORMS`: append `` `${C}master-data/category-form.tsx`, ``.
- [ ] **Step 5: Verify.** `node --test tests/v-track-m.test.ts tests/category-form-ui.test.ts tests/category-form-arrays.test.ts tests/master-data-sweep-ui.test.ts tests/button-size-switch.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts`; `npm test` (2248 tests, 2247 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npm run lint`. eol: `585 585`, `0 242`.
- [ ] **Step 6: Commit.** `git add src/components/master-data/category-form.tsx tests/category-form-ui.test.ts tests/validation-guards.test.ts tests/v-track-m.test.ts`, then `git commit -m "feat(master-data): the category form shows its errors under the field, also on each template row (v-track plan 1 task 23, M5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 24 (M6): The asset model form shows its errors under the field (`c/master-data/asset-model-form.tsx`)

Spec §5 #41, §6.2 (a duplicate name for the brand answers 409 on `name`). M1's pattern; the photo upload and delete are not field errors and keep their toasts.

**Files:** Modify `src/components/master-data/asset-model-form.tsx` (CRLF) · Pins `tests/master-data-sweep-ui.test.ts` (LF) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track-m.test.ts` (LF).

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports after `use-api-error` `:32` | — | `useFieldErrors`; `maxLength, required` | M-R3 |
| after `emptyModel :71` | — | table `name: "asset-model-name"`, `brandId: "asset-model-brand"`, `categoryId: "asset-model-category"`; `validate()` as the Step 1 test lists | M-R1, M-R2 |
| `:93`, `setField :103-105`, `handleSubmit :139-141` | as M1 | as M1 | M-R4, M-R5 |
| the save's refusal `:157-159` (the one after `body: JSON.stringify(payload),` `:154`) | as M1 | as M1; the upload (`:189-190`) and delete (`:212-213`) refusals stay | M-R4 |
| `<form>` `:236` | as M1 | as M1 | FIXED 6 |
| `:238`, `:247`, `:262` | `<Field label={t("modelName")} required>`, `<Field label={t("brand")} required>`, `<Field label={t("category")} required>` | `<Field label={t("modelName")} id="asset-model-name" required error={fieldErrors.message("name")}>`, `… id="asset-model-brand" required error={fieldErrors.message("brandId")}>`, `… id="asset-model-category" required error={fieldErrors.message("categoryId")}>` | M-R5 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-m.test.ts`:

```ts

test("asset model: errors under the field; a duplicate name for the brand lands under the name, and the photo upload keeps its toasts (v-track M6)", () => {
  const source = read(`${C}master-data/asset-model-form.tsx`)
  assertMigratedForm(source, { ids: { name: "asset-model-name", brandId: "asset-model-brand", categoryId: "asset-model-category" } })
  const rules = validateBody(source)
  for (const rule of [
    'check("name", required(values.name) ?? maxLength(values.name, 200))',
    'check("brandId", required(values.brandId))',
    'check("categoryId", required(values.categoryId))',
  ]) assert.ok(rules.includes(rule), rule)
  // Only the save reads fieldErrors; the photo upload and delete are not field errors and keep apiError.toast.
  assert.equal(source.match(/fieldErrors\.applyServer\(/g)?.length, 1)
  assert.equal(source.match(/apiError\.toast\(error\)/g)?.length, 3)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-m.test.ts`. Expected to fail: "asset model: errors under the field; a duplicate name for the brand lands under the name, and the photo upload keeps its toasts (v-track M6)". After Step 3 and before Step 4, `node --test tests/master-data-sweep-ui.test.ts` fails "asset model form: the form on the panel classes, the photo panel a ContentPanel, empties EmptyNote, the save-first note a neutral Notice, and no box around the dropzone (spec 2D D7, D9, M21)"; Step 4 is its edit.
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin and guard edits:**
  - `tests/master-data-sweep-ui.test.ts:108`, old `  assert.match(source, /<form onSubmit=\{handleSubmit\} className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/)` (the line after `const source = read("src/components/master-data/asset-model-form.tsx")`) → new `  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/)`.
  - `V_FORMS`: append `` `${C}master-data/asset-model-form.tsx`, ``.
- [ ] **Step 5: Verify.** `node --test tests/v-track-m.test.ts tests/master-data-sweep-ui.test.ts tests/master-data-brand-supplier-ui.test.ts tests/confirm-dialog-ui.test.ts tests/button-size-switch.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts`; `npm test` (2249 tests, 2248 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npm run lint`. eol: `463 463`, `0 256`.
- [ ] **Step 6: Commit.** `git add src/components/master-data/asset-model-form.tsx tests/master-data-sweep-ui.test.ts tests/validation-guards.test.ts tests/v-track-m.test.ts`, then `git commit -m "feat(master-data): the asset model form shows its errors under the field (v-track plan 1 task 24, M6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 25 (M7): The user form shows its errors under the field and under the role group (`c/admin/admin-user-form.tsx`)

Spec §4.5 (the password `minLength` is restated), §5 #43, §6.2 (username exists, "Password is required"); M-R4 (the password says its numbers), M-R8 (the role group).

**Files:** Modify `src/components/admin/admin-user-form.tsx` (CRLF) · Pins `tests/admin-user-form-ui.test.ts` (CRLF), `tests/admin-sweep-ui.test.ts` (LF) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track-m.test.ts` (LF).

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:10` | `import { Field } from "@/components/ui/field"` | `import { Field, FieldError } from "@/components/ui/field"` | M-R8 |
| imports `:15-17` | as M1 | `import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"`; `import { atLeastOne, email, maxLength, minLength, required } from "@/lib/validation-rules"` | M-R3 |
| after `emptyUser :51` | — | table `username: "admin-user-username"`, `password: "admin-user-password"`, `displayName: "admin-user-display-name"`, `email: "admin-user-email"`, `employeeId: "admin-user-employee"`, `roleIds: "admin-user-roles"`; `function validate(values: AdminUserFormValues, isEdit: boolean)` with the rules of the Step 1 test and, above the password line, `// A new user needs a password; an edit keeps the old one when the field stays empty.`; its header comment: `restates the controls' required, minLength, maxLength and` / `type="email", and the server's rule of at least one role (v-track M-R2).` | M-R2 |
| `:68-69` | `const [saving, setSaving] = useState(false)` | add `const fieldErrors = useFieldErrors<AdminUserField>()` and `const validationMessage = useValidationMessage()` | M-R3 |
| `setField :73-75` | as M1 | as M1, `focusFirstError` before it | M-R5 |
| `toggleRole :77-84` | ends `}))` | `fieldErrors.clear("roleIds")` after it | M-R5 |
| `handleSubmit :87-88` | `setSaving(true)` | `fieldErrors.setErrors(validate(values, isEdit))` / `if (focusFirstError()) return` / `setSaving(true)` | M-R4 |
| `:104-105` | `if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))` | `if (!response.ok) {` / M1's comment / `if (fieldErrors.applyServer(payload) && focusFirstError()) return` / `throw new Error(payload?.error ?? tCommon("error"))` / `}` | M-R4 |
| `<form>` `:126` | as M1 | as M1 | FIXED 6 |
| `:128`, `:146`, `:154`, `:162` | username, display name, email, employee Fields | `id` and `error={fieldErrors.message(…)}` per M-R5 (`employeeId` for the employee) | M-R5 |
| `:136` | `<Field label={isEdit ? t("newPassword") : t("password")} required={!isEdit}>` | one prop per line: `<Field` / `label={isEdit ? t("newPassword") : t("password")}` / `id="admin-user-password"` / `required={!isEdit}` / `error={fieldErrors.errors.password ? validationMessage(fieldErrors.errors.password, { min: 8, max: 100 }) : undefined}` / `>` | M-R4 |
| roles `:184-202` | `<section className="mt-6 border-t border-border pt-5">`, `<div className="mb-3 text-sm font-medium text-foreground">{t("roles")}</div>`, `roles.map((role) =>`, `<input` / `type="checkbox"` | the comment `{/* The roles are one group with one error under it; focus goes to its first checkbox (v-track M-R8). */}`; `<section` / `className="mt-6 border-t border-border pt-5"` / `role="group"` / `aria-labelledby="admin-user-roles-label"` / `aria-describedby={fieldErrors.errors.roleIds ? "admin-user-roles-error" : undefined}` / `>`; the title div gets `id="admin-user-roles-label"`; `roles.map((role, index) =>`; the checkbox's first prop `id={index === 0 ? "admin-user-roles" : undefined}`; after the grid `{fieldErrors.errors.roleIds ? (` / `<FieldError id="admin-user-roles-error" className="mt-2">{fieldErrors.message("roleIds")}</FieldError>` / `) : null}` | M-R8 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-m.test.ts`:

```ts

test("admin user: errors under the field, the password rule of create and edit, and one error under the role group (v-track M7)", () => {
  const source = read(`${C}admin/admin-user-form.tsx`)
  assertMigratedForm(source, {
    ids: {
      username: "admin-user-username",
      password: "admin-user-password",
      displayName: "admin-user-display-name",
      email: "admin-user-email",
      employeeId: "admin-user-employee",
      roleIds: "admin-user-roles",
    },
    messages: ["username", "displayName", "email", "employeeId"],
  })
  const rules = validateBody(source)
  assert.match(source, /^function validate\(values: AdminUserFormValues, isEdit: boolean\) \{$/m)
  for (const rule of [
    'check("username", required(values.username) ?? maxLength(values.username, 100))',
    'check("password", (isEdit ? null : required(values.password)) ?? minLength(values.password, 8) ?? maxLength(values.password, 100))',
    'check("displayName", required(values.displayName) ?? maxLength(values.displayName, 200))',
    'check("email", email(values.email) ?? maxLength(values.email, 200))',
    'check("roleIds", atLeastOne(values.roleIds))',
  ]) assert.ok(rules.includes(rule), rule)
  assert.match(source, /fieldErrors\.setErrors\(validate\(values, isEdit\)\)/)
  // A minimum length is said with its number (M-R4).
  assert.ok(source.includes("error={fieldErrors.errors.password ? validationMessage(fieldErrors.errors.password, { min: 8, max: 100 }) : undefined}"))
  // The roles: a labelled group tied to its one error; focus goes to the first checkbox; a toggle clears the error.
  assert.match(source, /<section\n\s+className="mt-6 border-t border-border pt-5"\n\s+role="group"\n\s+aria-labelledby="admin-user-roles-label"\n\s+aria-describedby=\{fieldErrors\.errors\.roleIds \? "admin-user-roles-error" : undefined\}\n\s+>/)
  assert.match(source, /<div id="admin-user-roles-label" className="mb-3 text-sm font-medium text-foreground">\{t\("roles"\)\}<\/div>/)
  assert.match(source, /<input\n\s+id=\{index === 0 \? "admin-user-roles" : undefined\}\n\s+type="checkbox"/)
  assert.ok(source.includes('<FieldError id="admin-user-roles-error" className="mt-2">{fieldErrors.message("roleIds")}</FieldError>'))
  assert.match(source, /: \[\.\.\.current\.roleIds, roleId\],\n\s+\}\)\)\n\s+fieldErrors\.clear\("roleIds"\)/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-m.test.ts`. Expected to fail: "admin user: errors under the field, the password rule of create and edit, and one error under the role group (v-track M7)". After Step 3 and before Step 4, `node --test tests/admin-user-form-ui.test.ts tests/admin-sweep-ui.test.ts` fails "the admin user form uses the shared fields, checkboxes and a busy save button (2C batch 4)" and "the admin user form is a panel with the shared panel classes and shows role keys as tags (spec 2D D9, M33)"; Step 4 is their edit.
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin and guard edits:**
  - `tests/admin-user-form-ui.test.ts:11`, old `  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)` → new `  assert.match(source, /import \{ Field, FieldError \} from "@\/components\/ui\/field"/)`.
  - `:21-24`, old (four lines): `  assert.equal(source.match(/<Field label=\{t\("(?:username|displayName)"\)\} required>\n\s+<Input\n/g)?.length, 2)` / `  assert.match(source, /<Field label=\{isEdit \? t\("newPassword"\) : t\("password"\)\} required=\{!isEdit\}>\n\s+<Input\n\s+type="password"\n/)` / `  assert.match(source, /<Field label=\{t\("email"\)\}>\n\s+<Input\n\s+type="email"\n/)` / `  assert.match(source, /<Field label=\{t\("employee"\)\}>\n\s+<NativeSelect\n/)` → new (five lines): `  // Each Field names its control and shows its error (v-track plan 1 M7).` / `  assert.equal(source.match(/<Field label=\{t\("(?:username|displayName)"\)\} id="admin-user-[\w-]+" required error=\{fieldErrors\.message\("\w+"\)\}>\n\s+<Input\n/g)?.length, 2)` / `  assert.match(source, /<Field\n\s+label=\{isEdit \? t\("newPassword"\) : t\("password"\)\}\n\s+id="admin-user-password"\n\s+required=\{!isEdit\}\n[^\n]*\n\s+>\n\s+<Input\n\s+type="password"\n/)` / `  assert.match(source, /<Field label=\{t\("email"\)\} id="admin-user-email" error=\{fieldErrors\.message\("email"\)\}>\n\s+<Input\n\s+type="email"\n/)` / `  assert.match(source, /<Field label=\{t\("employee"\)\} id="admin-user-employee" error=\{fieldErrors\.message\("employeeId"\)\}>\n\s+<NativeSelect\n/)`.
  - `tests/admin-sweep-ui.test.ts:98` (the line after `` const source = read(`${C}admin/admin-user-form.tsx`) ``), old `  assert.match(source, /<form onSubmit=\{handleSubmit\} className=` → new `  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className=` (the rest of the line as it is).
  - `V_FORMS`: append `` `${C}admin/admin-user-form.tsx`, ``.
- [ ] **Step 5: Verify.** `node --test tests/v-track-m.test.ts tests/admin-user-form-ui.test.ts tests/admin-sweep-ui.test.ts tests/form-frames-ui.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts`; `npm test` (2250 tests, 2249 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npm run lint`. eol: `275 275`, `0 289`.
- [ ] **Step 6: Commit.** `git add src/components/admin/admin-user-form.tsx tests/admin-user-form-ui.test.ts tests/admin-sweep-ui.test.ts tests/validation-guards.test.ts tests/v-track-m.test.ts`, then `git commit -m "feat(admin): the user form shows its errors under the field and under the role group (v-track plan 1 task 25, M7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 26 (M8): The role form shows its errors under the field and above the permission table (`c/admin/role-permission-form.tsx`)

Spec §4.5 (`pattern` restated), §5 #44, §6.2 (role name exists, invalid permission selection); M-R2 (the server's 2–50 length joins the pattern), M-R4, M-R8.

**Files:** Modify `src/components/admin/role-permission-form.tsx` (CRLF) · Pins `tests/role-permission-form-ui.test.ts` (CRLF) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track-m.test.ts` (LF).

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:12` | `import { Field } from "@/components/ui/field"` | `import { Field, FieldError } from "@/components/ui/field"` | M-R8 |
| after `use-api-error` `:18` | — | `useFieldErrors, useValidationMessage`; `maxLength, minLength, pattern, required` | M-R3 |
| before `export function RolePermissionForm(` `:36` | — | `type RoleMeta = { name: string; displayName: string; displayNameTh: string; description: string; isActive: boolean }` (one field per line); table `name: "role-key"`, `displayName: "role-display-name"`, `displayNameTh: "role-display-name-th"`, `description: "role-description"`, `permissionIds: "role-permissions"`; `function validate(values: RoleMeta)` as the Step 1 test lists; its comment: `restates the controls' required, maxLength and pattern, and` / `the server's length of the role key (v-track M-R2).` | M-R1, M-R2 |
| `:51` | `const [meta, setMeta] = useState({` | `const fieldErrors = useFieldErrors<RoleField>()`, `const validationMessage = useValidationMessage()`, `const [meta, setMeta] = useState<RoleMeta>({` | M-R3 |
| after `groupedPermissions` `:71` | — | `focusFirstError` as M1; `const firstPermissionId = groupedPermissions[0]?.[1][0]?.id`; `function setMetaField<K extends keyof RoleMeta>(field: K, value: RoleMeta[K])` (sets `meta`, clears the key as M-R5) | M-R5 |
| `togglePermission :73-84`, `setModulePermissions :86-99` | end `})` | `fieldErrors.clear("permissionIds")` after each | M-R5 |
| `handleSubmit :102-103`, `:118-119` | as M7 | `fieldErrors.setErrors(validate(meta))`; the refusal block as M7 | M-R4 |
| `<form>` `:139` | `<form onSubmit={handleSubmit} className="space-y-6">` | `<form onSubmit={handleSubmit} noValidate className="space-y-6">` | FIXED 6 |
| `:144` | `<Field label={t("roleKey")} required>` | one prop per line: `<Field` / `label={t("roleKey")}` / `id="role-key"` / `required` / `error={fieldErrors.errors.name ? validationMessage(fieldErrors.errors.name, { min: 2, max: 50 }) : undefined}` / `>` | M-R4 |
| `:153`, `:161`, `:179` | display name, Thai name, description Fields | `id` and `error={fieldErrors.message(…)}` per M-R5 | M-R5 |
| the five `onChange={(event) => setMeta((current) => ({ ...current, <field>: … }))}` | — | `onChange={(event) => setMetaField("<field>", event.target.value)}` (`event.target.checked` for `isActive`) | M-R5 |
| `:198` | `<DataTable framed={false} caption={t("permissionSelection")}>` … `</DataTable>` `:244` | before it: `{/* The permissions are one group with one error above the table; focus goes to the first permission (v-track M-R8). */}`, `{fieldErrors.errors.permissionIds ? (` / `<FieldError id="role-permissions-error" className="px-4 pt-3 md:px-5">{fieldErrors.message("permissionIds")}</FieldError>` / `) : null}`; the table wrapped in `<div` / `role="group"` / `aria-label={t("permissionSelection")}` / `aria-describedby={fieldErrors.errors.permissionIds ? "role-permissions-error" : undefined}` / `>` … `</div>` | M-R8 |
| permission checkbox `:229-235` | `<input` / `type="checkbox"` | first prop `id={permission.id === firstPermissionId ? "role-permissions" : undefined}` | M-R8 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-m.test.ts`:

```ts

test("role: errors under the field, the role key's length and pattern restated, and one error above the permission table (v-track M8)", () => {
  const source = read(`${C}admin/role-permission-form.tsx`)
  assertMigratedForm(source, {
    ids: {
      name: "role-key",
      displayName: "role-display-name",
      displayNameTh: "role-display-name-th",
      description: "role-description",
      permissionIds: "role-permissions",
    },
    messages: ["displayName", "displayNameTh", "description"],
  })
  const rules = validateBody(source)
  for (const rule of [
    'check("name", required(values.name) ?? minLength(values.name, 2) ?? maxLength(values.name, 50) ?? pattern(values.name, /^[a-z][a-z0-9_]*$/))',
    'check("displayName", required(values.displayName) ?? maxLength(values.displayName, 200))',
    'check("displayNameTh", maxLength(values.displayNameTh, 200))',
    'check("description", maxLength(values.description, 500))',
  ]) assert.ok(rules.includes(rule), rule)
  assert.match(source, /fieldErrors\.setErrors\(validate\(meta\)\)/)
  assert.ok(source.includes("error={fieldErrors.errors.name ? validationMessage(fieldErrors.errors.name, { min: 2, max: 50 }) : undefined}"))
  // Every meta field goes through setMetaField, which clears its error.
  assert.equal(source.match(/setMeta\(\(current\) =>/g)?.length, 1, "only inside setMetaField")
  assert.equal(source.match(/onChange=\{\(event\) => setMetaField\("\w+", event\.target\.(?:value|checked)\)\}/g)?.length, 5)
  // "Invalid permission selection" lands above the table, tied to the group; a toggle clears it.
  assert.ok(source.includes('<FieldError id="role-permissions-error" className="px-4 pt-3 md:px-5">{fieldErrors.message("permissionIds")}</FieldError>'))
  assert.match(source, /<div\n\s+role="group"\n\s+aria-label=\{t\("permissionSelection"\)\}\n\s+aria-describedby=\{fieldErrors\.errors\.permissionIds \? "role-permissions-error" : undefined\}\n\s+>/)
  assert.ok(source.includes('id={permission.id === firstPermissionId ? "role-permissions" : undefined}'))
  assert.equal(source.match(/\n    fieldErrors\.clear\("permissionIds"\)\n/g)?.length, 2, "togglePermission and setModulePermissions")
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-m.test.ts`. Expected to fail: "role: errors under the field, the role key's length and pattern restated, and one error above the permission table (v-track M8)". After Step 3 and before Step 4, `node --test tests/role-permission-form-ui.test.ts` fails "the role permission form uses the shared fields, 16px checkboxes in rows that read as locked, and a busy save button (2C batch 4)"; Step 4 is its edit.
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin and guard edits:**
  - `tests/role-permission-form-ui.test.ts:12`, old `  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)` → new `  assert.match(source, /import \{ Field, FieldError \} from "@\/components\/ui\/field"/)`.
  - `:18`, old `  assert.match(source, /<Field label=\{t\("roleKey"\)\} required>\n\s+<Input\n` → new `  assert.match(source, /<Field\n\s+label=\{t\("roleKey"\)\}\n\s+id="role-key"\n\s+required\n[^\n]*\n\s+>\n\s+<Input\n` (the rest of the line as it is).
  - `:19`, old `  assert.match(source, /<Field label=\{t\("description"\)\}>\n` → new `  assert.match(source, /<Field label=\{t\("description"\)\} id="role-description" error=\{fieldErrors\.message\("description"\)\}>\n`.
  - `V_FORMS`: append `` `${C}admin/role-permission-form.tsx`, ``.
- [ ] **Step 5: Verify.** `node --test tests/v-track-m.test.ts tests/role-permission-form-ui.test.ts tests/admin-sweep-ui.test.ts tests/form-frames-ui.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`; `npm test` (2251 tests, 2250 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npm run lint`. eol: `327 327` (re-indenting the table inside its new `<div>` adds no line), `0 320`.
- [ ] **Step 6: Commit.** `git add src/components/admin/role-permission-form.tsx tests/role-permission-form-ui.test.ts tests/validation-guards.test.ts tests/v-track-m.test.ts`, then `git commit -m "feat(admin): the role form shows its errors under the field and above the permission table (v-track plan 1 task 26, M8)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 27 (M9): Integration client create and edit show their errors under the field and keep the server's reason (`c/admin/IntegrationClientManager.tsx`)

Spec §4.4 ("integration scopes at least one" is a content rule; its button becomes enabled), §5 #47, #48 and the bug "IntegrationClientManager throws away the server's message"; M-R8, M-R11, M-R13, A-R3 (the scopes on `FieldGroup`, Task 17). Two forms in one file: two tables, two hooks, one `validate()` (the edit has no client id).

**Files:** Modify `src/components/admin/IntegrationClientManager.tsx` (CRLF) · Pins `tests/integration-api-client-admin.test.ts` (CRLF) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track-m.test.ts` (LF).

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:23-24` | `import { Field } from "@/components/ui/field"` / `import { checkboxVariants, fieldLabelClasses } from "@/components/ui/field-variants"` | `import { Field } from "@/components/ui/field"` / `import { FieldGroup } from "@/components/ui/field-group"` / `import { checkboxVariants } from "@/components/ui/field-variants"` (the two legends move into `FieldGroup`) | A-R3 |
| after `status-badge` `:28` | — | `import { useApiError } from "@/components/ui/use-api-error"`, `import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"`; after `cn` `import { atLeastOne, maxLength, minLength, pattern, required } from "@/lib/validation-rules"` | M-R3 |
| after `scopeOptions :118` | — | `CREATE_FIELD_IDS` (`clientId: "integration-client-id"`, `displayName: "integration-display-name"`, `scopes: "integration-scopes"`), `CreateField`, `CREATE_FIELD_ORDER`; `EDIT_FIELD_IDS` (`displayName: "integration-edit-display-name"`, `scopes: "integration-edit-scopes"`), `EditField`, `EDIT_FIELD_ORDER`; `function validate(values: { clientId?: string; displayName: string; scopes: readonly string[] })` returning `Partial<Record<CreateField, string>>`, the client id checked only `if (values.clientId !== undefined)`, rules as the Step 1 test lists; the comment above the tables says a scope key's id is its `FieldGroup`'s | M-R1, M-R2, A-R3 |
| after `const confirm = useConfirm()` `:121` | — | `const apiError = useApiError()`, `const createErrors = useFieldErrors<CreateField>()`, `const editErrors = useFieldErrors<EditField>()`, `const validationMessage = useValidationMessage()` | M-R3 |
| `toggleScope :176-184`, `toggleEditScope :200-208` | the `next.length > 0 ? next : current` keep-the-last rule | one line each: `setSelectedScopes((current) => (current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]))` then `createErrors.clear("scopes")` (edit: `setEditScopes`, `editErrors.clear("scopes")`); above `toggleScope` the two focus helpers `focusFirstCreateError` / `focusFirstEditError` (M1's shape with each table) and the comment `// The last scope can be unchecked now: "at least one" shows as an error on submit (spec §4.4).` | M-R11 |
| `openEditClient :186-191` | ends `setError(null)` | `editErrors.setErrors({})` after it | M-R5 |
| `createClient :216-219` | `event.preventDefault()` / `setSaving(true)` | `event.preventDefault()` / `createErrors.setErrors(validate({ clientId, displayName, scopes: selectedScopes }))` / `if (focusFirstCreateError()) return` / `setSaving(true)` | M-R4 |
| `:226` | `if (!response.ok) throw new Error(labels.createFailed)` | `if (!response.ok) {` / `const result = await response.json().catch(() => null)` / `// A refusal that names a field shows under it; any other shows the server's reason, no longer a fixed text.` / `if (createErrors.applyServer(result) && focusFirstCreateError()) return` / `throw new Error(apiError.describe(result?.error ?? labels.createFailed).message)` / `}` | M-R13 |
| `updateEditingClient :243-245` | `if (!editingClient) return` / `if (!(await confirmScopeExpansion(…))) return` | between them: `editErrors.setErrors(validate({ displayName: editDisplayName, scopes: editScopes }))` / `if (focusFirstEditError()) return` | M-R4 |
| `:256` | `if (!response.ok) throw new Error(labels.actionFailed)` (the one before `as { data: IntegrationClient }`) | the block of `:226` with `editErrors`, `focusFirstEditError`, `labels.actionFailed` (no comment); rotate / enable / disable `:294` stay | M-R13 |
| `:404` | `<form onSubmit={updateEditingClient} className={accessibleDialogFormClasses}>` | `<form onSubmit={updateEditingClient} noValidate className={accessibleDialogFormClasses}>` | FIXED 6 |
| `:411-418` | `<Field label={labels.displayName} required>`, `onChange={(event) => setEditDisplayName(event.target.value)}` | `<Field label={labels.displayName} id="integration-edit-display-name" required error={editErrors.message("displayName")}>`; `onChange` a block: `setEditDisplayName(event.target.value)` / `editErrors.clear("displayName")` | M-R5 |
| edit scopes `:419-437` | `<fieldset className="min-w-0">` / `<legend className={cn(fieldLabelClasses, "mb-1.5")}>{labels.scopes}</legend>` … `</fieldset>` | `<FieldGroup legend={labels.scopes} id="integration-edit-scopes" error={editErrors.message("scopes")}>` … `</FieldGroup>`; the grid of checkboxes inside stays as it is, with no id on a checkbox (focus goes from the group to its first box, F-R5) | A-R3 |
| `:441` | `<Button type="submit" busy={updatingClient} disabled={editScopes.length === 0}>` | `<Button type="submit" busy={updatingClient}>` | M-R11 |
| `:451` | `<form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" onSubmit={createClient}>` | `<form onSubmit={createClient} noValidate className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">` | FIXED 6 |
| `:452-462` | `<Field label={labels.clientId} required>`, `onChange={(event) => setClientId(event.target.value)}` | one prop per line: `<Field` / `label={labels.clientId}` / `id="integration-client-id"` / `required` / `error={createErrors.errors.clientId ? validationMessage(createErrors.errors.clientId, { min: 3, max: 100 }) : undefined}` / `>`; `onChange` a block that also calls `createErrors.clear("clientId")` | M-R4, M-R5 |
| `:463-471` | `<Field label={labels.displayName} required>` | `<Field label={labels.displayName} id="integration-display-name" required error={createErrors.message("displayName")}>`; `onChange` a block with `createErrors.clear("displayName")` | M-R5 |
| create scopes `:472-487` | `<fieldset className="min-w-0 lg:col-span-2">` / its legend … `</fieldset>` | `<FieldGroup legend={labels.scopes} id="integration-scopes" className="lg:col-span-2" error={createErrors.message("scopes")}>` … `</FieldGroup>`, the grid as it is | A-R3 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-m.test.ts`:

```ts

test("integration clients: create and edit show errors under the field, at least one scope is an error on submit, and the server's reason is no longer thrown away (v-track M9)", () => {
  const source = read(`${C}admin/IntegrationClientManager.tsx`)
  assertMigratedForm(source, {
    handler: "createClient",
    table: "CREATE_FIELD_IDS",
    hook: "createErrors",
    ids: { clientId: "integration-client-id", displayName: "integration-display-name", scopes: "integration-scopes" },
    messages: ["displayName", "scopes"],
  })
  assertMigratedForm(source, {
    handler: "updateEditingClient",
    table: "EDIT_FIELD_IDS",
    hook: "editErrors",
    ids: { displayName: "integration-edit-display-name", scopes: "integration-edit-scopes" },
    messages: ["displayName", "scopes"],
  })
  const rules = validateBody(source)
  for (const rule of [
    'check("clientId", required(values.clientId) ?? minLength(values.clientId, 3) ?? maxLength(values.clientId, 100) ?? pattern(values.clientId, /^[A-Za-z0-9._:-]+$/))',
    'check("displayName", required(values.displayName) ?? maxLength(values.displayName, 200))',
    'check("scopes", atLeastOne(values.scopes))',
  ]) assert.ok(rules.includes(rule), rule)
  assert.ok(source.includes("createErrors.setErrors(validate({ clientId, displayName, scopes: selectedScopes }))"))
  assert.ok(source.includes("editErrors.setErrors(validate({ displayName: editDisplayName, scopes: editScopes }))"))
  assert.ok(source.includes("error={createErrors.errors.clientId ? validationMessage(createErrors.errors.clientId, { min: 3, max: 100 }) : undefined}"))
  // "At least one scope" is a content rule (spec §4.4): no silent keep-the-last rule, no disabled save, one group error.
  assert.doesNotMatch(source, /next\.length > 0 \? next : current|disabled=\{editScopes\.length === 0\}/)
  // Each scope list is a FieldGroup (F7): its error under the group, tied to the fieldset; focus goes to its first box.
  assert.ok(source.includes('<FieldGroup legend={labels.scopes} id="integration-scopes" className="lg:col-span-2" error={createErrors.message("scopes")}>'))
  assert.ok(source.includes('<FieldGroup legend={labels.scopes} id="integration-edit-scopes" error={editErrors.message("scopes")}>'))
  assert.doesNotMatch(source, /<fieldset\b|fieldLabelClasses|<FieldError\b/)
  // The server's reason, described like every other server error, instead of the fixed createFailed / actionFailed.
  assert.ok(source.includes("throw new Error(apiError.describe(result?.error ?? labels.createFailed).message)"))
  assert.ok(source.includes("throw new Error(apiError.describe(result?.error ?? labels.actionFailed).message)"))
  assert.doesNotMatch(source, /throw new Error\(labels\.(?:createFailed|actionFailed)\)\n\s+const payload = \(await response\.json\(\)\) as \{ data: IntegrationClient(?:; token: string)? \}/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-m.test.ts`. Expected to fail: "integration clients: create and edit show errors under the field, at least one scope is an error on submit, and the server's reason is no longer thrown away (v-track M9)". After Step 3 and before Step 4, `node --test tests/integration-api-client-admin.test.ts` fails "integration client manager: the edit dialog uses the dialog parts and shows its own error, and the fields use Field (2C batch 4)"; Step 4 is its edit.
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin and guard edits** (all in `tests/integration-api-client-admin.test.ts`, the test of Step 2):
  - old `<form onSubmit=\{updateEditingClient\} className=\{accessibleDialogFormClasses\}>` → new `<form onSubmit=\{updateEditingClient\} noValidate className=\{accessibleDialogFormClasses\}>` (inside the `:239` regex).
  - old `<Button type="submit" busy=\{updatingClient\} disabled=\{editScopes\.length === 0\}>` → new `<Button type="submit" busy=\{updatingClient\}>` (inside the `:241` regex).
  - `:242`, old `  assert.equal(source.match(/<Field label=\{labels\.(?:clientId|displayName)\} required>\n\s+<Input\n/g)?.length, 3)` → new, three lines: `  // Each Field names its control and shows its error (v-track plan 1 M9).` / `  assert.equal(source.match(/<Field label=\{labels\.displayName\} id="integration-(?:edit-)?display-name" required error=\{(?:create|edit)Errors\.message\("displayName"\)\}>\n\s+<Input\n/g)?.length, 2)` / `  assert.match(source, /<Field\n\s+label=\{labels\.clientId\}\n\s+id="integration-client-id"\n\s+required\n[^\n]*\n\s+>\n\s+<Input\n/)`.
  - `:244` (one line becomes two), old `  assert.equal(source.match(/<fieldset className="min-w-0(?: lg:col-span-2)?">\n\s+<legend className=\{cn\(fieldLabelClasses, "mb-1\.5"\)\}>\{labels\.scopes\}<\/legend>/g)?.length, 2)` → new `  // The scopes are one FieldGroup each, with the error under the group (v-track plan 1 M9).` / `  assert.equal(source.match(/<FieldGroup legend=\{labels\.scopes\} id="integration-(?:edit-)?scopes"(?: className="lg:col-span-2")? error=\{(?:create|edit)Errors\.message\("scopes"\)\}>/g)?.length, 2)` (A-R3).
  - `V_FORMS`: append `` `${C}admin/IntegrationClientManager.tsx`, ``.
- [ ] **Step 5: Verify.** `node --test tests/v-track-m.test.ts tests/integration-api-client-admin.test.ts tests/admin-sweep-ui.test.ts tests/attachment-preview-dialog-ui.test.ts tests/confirm-dialog-ui.test.ts tests/phase2d-final-ui.test.ts tests/list-pages-ui.test.ts tests/accessible-dialog.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts`; `npm test` (2252 tests, 2251 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npm run lint`. eol: `887 887` (the assembly check; M's draft without `FieldGroup` had 896), `0 357`.
- [ ] **Step 6: Commit.** `git add src/components/admin/IntegrationClientManager.tsx tests/integration-api-client-admin.test.ts tests/validation-guards.test.ts tests/v-track-m.test.ts`, then `git commit -m "feat(admin): integration client create and edit show their errors under the field and keep the server's reason (v-track plan 1 task 27, M9)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 28 (M10): The state review dialog checks its reason on submit and shows the server's refusal under the field (`c/admin/asset-state-review-dialog.tsx`, `asset-state-review-workspace.tsx`)

Spec §4.4 ("state-review reason ≥ 10" is a content rule; its button becomes enabled), §4.1 (a server refusal looks like a client one), §5 #49; M-R9, M-R11.

**Files:** Modify `src/components/admin/asset-state-review-dialog.tsx`, `asset-state-review-workspace.tsx` (CRLF) · Pins `tests/asset-state-review-ui.test.ts` (CRLF) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track-m.test.ts` (LF).

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| dialog imports `:12-14` | `Field`, `NativeSelect`, `Textarea` | + `import { Notice } from "@/components/ui/notice"` (after `native-select`), `import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"`, `import { maxLength, minLength, required } from "@/lib/validation-rules"` | M-R3 |
| after `export type ReviewTarget` `:16` | — | table `statusId: "state-review-status"`, `conditionId: "state-review-condition"`, `reason: "state-review-reason"` with the comment `// … The` / `// server's "a status or condition target is required" has no field: it comes as _form and shows above the fields.`; `function validate(values: { reason: string })` with the one rule of the Step 1 test | M-R1, M-R2 |
| `:39` | `onSubmit: (input: { statusId?: string; conditionId?: string; reason: string }) => Promise<void>` | `// Resolves to the server's body when it refused the input (the workspace hands it back), else to nothing.` / `onSubmit: (input: { statusId?: string; conditionId?: string; reason: string }) => Promise<unknown>` | M-R9 |
| after `reasonRef :44` | — | `fieldErrors`, `validationMessage`, `focusFirstError` (M1's shape); `async function handleSubmit(event: React.FormEvent<HTMLFormElement>)`: `event.preventDefault()`, `fieldErrors.setErrors(validate({ reason }))`, `if (focusFirstError()) return`, `const refusal = await onSubmit({ …the three spreads of today… })`, `// Under its field, or (the _form key) in the Notice above the fields; the dialog stays open either way.`, `if (fieldErrors.applyServer(refusal) && focusFirstError()) return` | M-R9 |
| `:55-65` | `<form` / `className={accessibleDialogFormClasses}` / `onSubmit={(event) => { … void onSubmit({ … }) }}` / `>` | `<form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>` | FIXED 6 |
| first child of the body `:66` | — | `{fieldErrors.errors._form ? <Notice tone="danger" role="alert">{fieldErrors.message("_form")}</Notice> : null}` | M-R9 |
| `:68`, `:79` | `<Field label={labels.nextStatus}>`, `<Field label={labels.nextCondition}>`; `onChange={(event) => setStatusId(event.target.value)}` | `<Field label={labels.nextStatus} id="state-review-status" error={fieldErrors.message("statusId")}>` (condition likewise); each `onChange` a block that also clears its key | M-R5 |
| `:89` | `<Field label={labels.reason} required hint={labels.reasonHelp}>`; `onChange={(event) => setReason(event.target.value)}` | one prop per line: `<Field` / `label={labels.reason}` / `id="state-review-reason"` / `required` / `hint={labels.reasonHelp}` / `error={fieldErrors.errors.reason ? validationMessage(fieldErrors.errors.reason, { min: 10, max: 2000 }) : undefined}` / `>`; `onChange` a block with `fieldErrors.clear("reason")` | M-R4 |
| `:109` | `disabled={reason.trim().length < 10}` | gone | M-R11 |
| workspace `:114-118` | `const body = … as { error?: string; code?: string }` / `if (body.code === "ASSET_STATE_REVIEW_STALE") toast.error(labels.staleError)` / `else apiError.toast(body.error ?? labels.saveError)` | the type gains `fieldErrors?: Record<string, string>`; between the two lines: `// A validation refusal goes back to the dialog, which shows it under the field (v-track M-R9).` / `else if (body.code === "VALIDATION_FAILED" && body.fieldErrors) return body` | M-R9 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-m.test.ts`:

```ts

test("asset state review: the 10-character reason is an error on submit, and a refusal comes back from the workspace to the dialog's fields (v-track M10)", () => {
  const dialog = read(`${C}admin/asset-state-review-dialog.tsx`)
  assertMigratedForm(dialog, {
    ids: { statusId: "state-review-status", conditionId: "state-review-condition", reason: "state-review-reason" },
    messages: ["statusId", "conditionId"],
  })
  assert.ok(validateBody(dialog).includes('check("reason", required(values.reason) ?? minLength(values.reason, 10) ?? maxLength(values.reason, 2000))'))
  assert.ok(dialog.includes("error={fieldErrors.errors.reason ? validationMessage(fieldErrors.errors.reason, { min: 10, max: 2000 }) : undefined}"))
  // A content rule, not a gate (spec §4.4): the confirm button is enabled.
  assert.doesNotMatch(dialog, /(?<![\w-])disabled=\{/)
  // The server's target rule has no field: the _form key shows in the dialog's Notice.
  assert.ok(dialog.includes('{fieldErrors.errors._form ? <Notice tone="danger" role="alert">{fieldErrors.message("_form")}</Notice> : null}'))
  assert.match(dialog, /onSubmit: \(input: \{ statusId\?: string; conditionId\?: string; reason: string \}\) => Promise<unknown>/)
  assert.match(dialog, /const refusal = await onSubmit\(\{/)
  const workspace = read(`${C}admin/asset-state-review-workspace.tsx`)
  assert.ok(workspace.includes('else if (body.code === "VALIDATION_FAILED" && body.fieldErrors) return body'))
  assert.ok(workspace.includes('if (body.code === "ASSET_STATE_REVIEW_STALE") toast.error(labels.staleError)'), "the stale conflict keeps its toast")
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-m.test.ts`. Expected to fail: "asset state review: the 10-character reason is an error on submit, and a refusal comes back from the workspace to the dialog's fields (v-track M10)". After Step 3 and before Step 4, `node --test tests/asset-state-review-ui.test.ts` fails "the asset state review dialog uses the dialog parts, shared fields and a busy confirm that keeps its label (2C batch 4)"; Step 4 is its edit.
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin and guard edits** (all in `tests/asset-state-review-ui.test.ts`, the test of Step 2):
  - `:47`, old `  assert.match(dialog, /<form\n\s+className=\{accessibleDialogFormClasses\}\n\s+onSubmit=\{\(event\) => \{/)` → new `  assert.match(dialog, /<form onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>/)`.
  - `:49-51`, old (three lines): `  assert.match(dialog, /<Field label=\{labels\.nextStatus\}>\n\s+<NativeSelect\n\s+name="statusId"/)` / `  assert.match(dialog, /<Field label=\{labels\.nextCondition\}>\n\s+<NativeSelect\n\s+name="conditionId"/)` / `  assert.match(dialog, /<Field label=\{labels\.reason\} required hint=\{labels\.reasonHelp\}>\n\s+<Textarea\n\s+ref=\{reasonRef\}\n\s+name="resolutionReason"/)` → new (four lines): `  // Each Field names its control and shows its error (v-track plan 1 M10).` / `  assert.match(dialog, /<Field label=\{labels\.nextStatus\} id="state-review-status" error=\{fieldErrors\.message\("statusId"\)\}>\n\s+<NativeSelect\n\s+name="statusId"/)` / `  assert.match(dialog, /<Field label=\{labels\.nextCondition\} id="state-review-condition" error=\{fieldErrors\.message\("conditionId"\)\}>\n\s+<NativeSelect\n\s+name="conditionId"/)` / `  assert.match(dialog, /<Field\n\s+label=\{labels\.reason\}\n\s+id="state-review-reason"\n\s+required\n\s+hint=\{labels\.reasonHelp\}\n[^\n]*\n\s+>\n\s+<Textarea\n\s+ref=\{reasonRef\}\n\s+name="resolutionReason"/)`.
  - inside the `:52` regex, old `\n\s+busy=\{busy\}\n\s+disabled=\{reason\.trim\(\)\.length < 10\}\n\s+>` → new `\n\s+busy=\{busy\}\n\s+>`.
  - `V_FORMS`: append `` `${C}admin/asset-state-review-dialog.tsx`, ``.
- [ ] **Step 5: Verify.** `node --test tests/v-track-m.test.ts tests/asset-state-review-ui.test.ts tests/accessible-dialog.test.ts tests/admin-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts`; `npm test` (2253 tests, 2252 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npm run lint`. eol: `163 163`, `275 275`, `0 376`.
- [ ] **Step 6: Commit.** `git add src/components/admin/asset-state-review-dialog.tsx src/components/admin/asset-state-review-workspace.tsx tests/asset-state-review-ui.test.ts tests/validation-guards.test.ts tests/v-track-m.test.ts`, then `git commit -m "feat(admin): the state review dialog checks its reason on submit and shows the server's refusal under the field (v-track plan 1 task 28, M10)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 29 (M11): The data-quality rules and the report preset name validate as forms, and the rules show the server's reason (`c/admin/data-quality-rule-form.tsx`, `c/reports/report-preset-controls.tsx`)

Spec §4.5 and §8 (every form of the scope has `noValidate` and `validate(`), §5 #50 (the bare `catch`), #52 (the preset name, spec §11 call 9); M-R12.

**Files:** Modify `src/components/admin/data-quality-rule-form.tsx`, `src/components/reports/report-preset-controls.tsx` (CRLF) · Pins `tests/data-quality-rule-form-ui.test.ts`, `tests/report-presets.test.ts` (CRLF), `tests/reports-dashboard-sweep-ui.test.ts` (LF) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track-m.test.ts` (LF).

**Changes at 71e5251:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| rules `:3-4` | `import { useMemo, useState } from "react"` | + `import type { FormEvent } from "react"`; after `native-select` `import { useApiError } …`, `import { useFieldErrors } …` | M-R3 |
| rules, before `export function DataQualityRuleForm` `:30` | — | ``const severityId = (key: string) => `data-quality-severity-${key}` `` (comment `// One severity per rule, keyed <rule>.severity, with the id focus moves to (v-track M-R1).`); `function validate(items: readonly AssetDataQualityRule[])` with the one rule of the Step 1 test (comment: the severity is one of its two choices; noValidate keeps the browser out like every V-track form, M-R2, M-R12) | M-R12 |
| rules `:31-56` | `save = async () => {` … `if (!response.ok) throw new Error(await response.text())` … `} catch {` / `toast.error(labels.error)` | `apiError`, `fieldErrors = useFieldErrors<string>()`; ``focusFirstError = () => fieldErrors.focusFirst(items.map((item) => `${item.key}.severity`), { idFor: (key) => severityId(key.slice(0, key.indexOf("."))) })``; `updateRule` clears `` `${key}.severity` `` when `patch.severity`; `const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {` with `preventDefault`, `fieldErrors.setErrors(validate(items))`, `if (focusFirstError()) return`; on `!ok`: `const result = await response.json().catch(() => null)` / `if (fieldErrors.applyServer(result) && focusFirstError()) return` / `throw new Error(result?.error ?? labels.error)`; `} catch (error) {` / `// The server's reason, described like every other server error (it was a bare catch with a fixed text).` / `apiError.toast(error)` | M-R12 |
| rules `:59`, `:96` | `<ContentPanel` … `</ContentPanel>` | wrapped in `<form onSubmit={handleSubmit} noValidate>` … `</form>` | M-R12 |
| rules `:62` | `<Button busy={saving} onClick={save} className="w-fit">` | `<Button type="submit" busy={saving} className="w-fit">` | M-R12 |
| rules `:83` | `<Field label={labels.severity}>` | `` <Field label={labels.severity} id={severityId(rule.key)} error={fieldErrors.message(`${rule.key}.severity`)}> `` | M-R5 |
| preset `:3` | `import { useState, useSyncExternalStore } from "react"` | + `import type { FormEvent } from "react"`; after `notice` `import { useFieldErrors } …`; after `cn` `import { maxLength, required } from "@/lib/validation-rules"` | M-R3 |
| preset after `cachedReportPresets :23` | — | table `name: "report-preset-name"` (comment: it saves on this device only, so no server error comes back); `validate()` with the rule of the Step 1 test (comment: the empty name was a Notice under the row, an error under the field now; maxLength restated) | M-R12 |
| preset `:42` | `const [message, setMessage] = useState("")` | + `const fieldErrors = useFieldErrors<PresetField>()` | M-R3 |
| preset `savePreset :53-63` | `function savePreset() {` … `if (!preset) { setMessage(labels.presetNameRequired); return }` | `function handleSubmit(event: FormEvent<HTMLFormElement>) {` / `event.preventDefault()` / `fieldErrors.setErrors(validate({ name }))` / `if (fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })) return` / the `buildReportPreset` call / `if (!preset) return` | M-R12 |
| preset `:78-93` | `<div className="flex flex-col gap-3 sm:flex-row sm:items-end">` … `<Field label={labels.presetName} className="min-w-0 flex-1">` … `<Button size="lg" onClick={savePreset}>` … `</div>` | the comment `{/* items-start: an error under the name must not push the button down; mt-6.5 is the label row (20px) and its gap (6px). */}`; `<form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">`; `<Field` / `label={labels.presetName}` / `id="report-preset-name"` / `className="min-w-0 flex-1"` / `error={fieldErrors.errors.name === "required" ? labels.presetNameRequired : fieldErrors.message("name")}` / `>`; the `onChange` also calls `fieldErrors.clear("name")`; `<Button type="submit" size="lg" className="sm:mt-6.5">`; `</form>` | M-R4, M-R12 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-m.test.ts`:

```ts

test("data-quality rules and the report preset name become forms that validate themselves; the rules keep the server's reason (v-track M11)", () => {
  // The data-quality rules: one severity per rule, keyed <rule>.severity; the bare catch now shows the server's reason.
  const rules = read(`${C}admin/data-quality-rule-form.tsx`)
  assert.match(rules, /<form onSubmit=\{handleSubmit\} noValidate>/)
  assert.match(rules, /<Button type="submit" busy=\{saving\} className="w-fit">/)
  assert.ok(validateBody(rules).includes('for (const rule of items) check(`${rule.key}.severity`, rule.severity === "warning" || rule.severity === "danger" ? null : "invalidChoice")'))
  assert.match(rules, /fieldErrors\.setErrors\(validate\(items\)\)/)
  assert.match(rules, /if \(fieldErrors\.applyServer\(result\) && focusFirstError\(\)\) return/)
  assert.ok(rules.includes("<Field label={labels.severity} id={severityId(rule.key)} error={fieldErrors.message(`${rule.key}.severity`)}>"))
  assert.match(rules, /\} catch \(error\) \{\n[^\n]*\n\s+apiError\.toast\(error\)\n/)
  assert.doesNotMatch(rules, /toast\.error\(|await response\.text\(\)|\} catch \{/)

  // The report preset name: saved on this device only (no server); its required text is the preset's own message.
  const preset = read(`${C}reports/report-preset-controls.tsx`)
  assertMigratedForm(preset, { ids: { name: "report-preset-name" }, messages: [], server: false })
  assert.ok(validateBody(preset).includes('check("name", required(values.name) ?? maxLength(values.name, 60))'))
  assert.ok(preset.includes('error={fieldErrors.errors.name === "required" ? labels.presetNameRequired : fieldErrors.message("name")}'))
  assert.match(preset, /<form onSubmit=\{handleSubmit\} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">/)
  assert.doesNotMatch(preset, /setMessage\(labels\.presetNameRequired\)|function savePreset\b/)
  // The Notice under the row stays for the storage failure, which is not a field error.
  assert.match(preset, /setMessage\(labels\.presetStorageFailed\)/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-m.test.ts`. Expected to fail: "data-quality rules and the report preset name become forms that validate themselves; the rules keep the server's reason (v-track M11)". After Step 3 and before Step 4, `node --test tests/data-quality-rule-form-ui.test.ts tests/report-presets.test.ts tests/reports-dashboard-sweep-ui.test.ts` fails "the data-quality rule form names each severity select after its rule and uses the shared field, checkbox and busy save (2C batch 4)", "the preset name uses the shared Field and Input and keeps its 60-character limit (2C batch 4)" and "report presets: lg save beside the 40px field, an outline icon-sm delete, a text-link row, an error Notice and EmptyNote (spec 2D M29, D5, D7)"; Step 4 is their edit.
- [ ] **Step 3: Implement** per the Changes table (re-indent the panel inside the new `<form>`).
- [ ] **Step 4: Pin and guard edits:**
  - `tests/data-quality-rule-form-ui.test.ts:14`, old `  assert.match(source, /<Field label=\{labels\.severity\}>\n` → new ``  assert.match(source, /<Field label=\{labels\.severity\} id=\{severityId\(rule\.key\)\} error=\{fieldErrors\.message\(`\$\{rule\.key\}\.severity`\)\}>\n`` (the rest of the line as it is); `:16`, old `  assert.match(source, /<Button busy=\{saving\} onClick=\{save\} className="w-fit">` → new `  assert.match(source, /<Button type="submit" busy=\{saving\} className="w-fit">`.
  - `tests/report-presets.test.ts:83`, old `  assert.match(source, /<Field label=\{labels\.presetName\} className="min-w-0 flex-1">\n\s+<Input\n\s+value=\{name\}/)` → new `  assert.match(source, /<Field\n\s+label=\{labels\.presetName\}\n\s+id="report-preset-name"\n\s+className="min-w-0 flex-1"\n[^\n]*\n\s+>\n\s+<Input\n\s+value=\{name\}/)`; `:86`, old `  assert.match(source, /<\/div>\n\s+<p className="mt-2 text-xs text-muted-foreground">\{labels\.savedPresetsDeviceOnly\}<\/p>/)` → new `  assert.match(source, /<\/form>\n\s+<p className="mt-2 text-xs text-muted-foreground">\{labels\.savedPresetsDeviceOnly\}<\/p>/)`.
  - `tests/reports-dashboard-sweep-ui.test.ts:31`, old `  assert.match(source, /<Button size="lg" onClick=\{savePreset\}>\n\s+<BookmarkPlus aria-hidden="true" \/>/)` → new `  assert.match(source, /<Button type="submit" size="lg" className="sm:mt-6\.5">\n\s+<BookmarkPlus aria-hidden="true" \/>/)`.
  - `V_FORMS`: append `` `${C}admin/data-quality-rule-form.tsx`, `` and `` `${C}reports/report-preset-controls.tsx`, ``.
- [ ] **Step 5: Verify.** `node --test tests/v-track-m.test.ts tests/data-quality-rule-form-ui.test.ts tests/admin-sweep-ui.test.ts tests/report-presets.test.ts tests/reports-dashboard-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/ui-overlay-guards.test.ts tests/design-system.test.ts`; `npm test` (2254 tests, 2253 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npm run lint` (0 errors, 146 warnings, all under `.agents/`). eol: `130 130` and `179 179`, `0 399`. The controller's check confirms that `sm:mt-6.5` is in the built CSS (the rehearsal's Tailwind compile emitted `margin-top: calc(var(--spacing) * 6.5)` under `sm`).
- [ ] **Step 6: Commit.** `git add src/components/admin/data-quality-rule-form.tsx src/components/reports/report-preset-controls.tsx tests/data-quality-rule-form-ui.test.ts tests/report-presets.test.ts tests/reports-dashboard-sweep-ui.test.ts tests/validation-guards.test.ts tests/v-track-m.test.ts`, then `git commit -m "feat(admin): the data-quality rules and the report preset name validate as forms, and the rules show the server's reason (v-track plan 1 task 29, M11)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Rehearsal record (area M)

Clone `<temp>/sim-M` of `71e5251` (CRLF working tree, `core.autocrlf=true`, its own copy of `node_modules`); stand-in commit `2758ccaf` (not a plan task, see the area's rehearsal paragraph). First run on branch `m-sim`, one commit per task as written; then the whole chain again from `2758ccaf` on branch `m-replay` with the final Step 1 blocks (the helper of M1 as printed above) and the same edits, by `<temp>/m-tools/replay.mjs`; the two trees are identical (`git diff m-sim m-replay` is empty). The "Step 4 pins" column comes from `<temp>/m-tools/midcheck.mjs`: each task's source with the pin files of the commit before.

| Task | `m-sim` | `m-replay` | Step 2 (the new test fails first) | Step 4 pins failing before their edit | `npm test` after (tests / pass / fail / skipped) | test file |
|---|---|---|---|---|---|---|
| M1 | `8ea3737f` | `34adb0ea` | M1's test, "noValidate directly after onSubmit" | 4: brand, company, department form tests, "the seven simple master-data forms…" | 2228 / 2227 / 0 / 1 | `0 92` |
| M2 | `a89f14a3` | `797abcab` | M2's test, same message | 2: the branch and location form tests | 2229 / 2228 / 0 / 1 | `0 145` |
| M3 | `b0ab6912` | `ee8c005e` | M3's test, same message | 2: the two employee form tests | 2230 / 2229 / 0 / 1 | `0 179` |
| M4 | `a50c8fb6` | `b4859312` | M4's test, same message | 2: "supplier form presents associated inline errors", "supplier form localization keys stay aligned" | 2231 / 2230 / 0 / 1 (the parser module kept: the stand-in's `supplier-api-error.ts` imports it) | `0 213` |
| M5 | `40c5455d` | `48e9e2ec` | M5's test, same message | 1: "the template editors keep their move limits and use the shared button looks (2C batch 2)" | 2232 / 2231 / 0 / 1 | `0 242` |
| M6 | `93b2e58a` | `55902294` | M6's test, same message | 1: the asset model sweep test | 2233 / 2232 / 0 / 1 | `0 256` |
| M7 | `920758ff` | `8902dbb8` | M7's test, same message | 2: the two admin user form tests | 2234 / 2233 / 0 / 1 | `0 289` |
| M8 | `0a8ddde0` | `422a715f` | M8's test, same message | 1: the role permission form test (2C batch 4) | 2235 / 2234 / 0 / 1 | `0 320` |
| M9 | `c29480d0` | `dc4b3e51` | M9's test, same message | 1: "integration client manager: the edit dialog…" | 2236 / 2235 / 0 / 1 | `0 357` |
| M10 | `8ea6554b` | `023a25e1` | M10's test, same message | 1: "the asset state review dialog uses the dialog parts…" | 2237 / 2236 / 0 / 1 | `0 376` |
| M11 | `e09067e4` | `a2d20529` | M11's test, "did not match /<form onSubmit=\{handleSubmit\} noValidate>/" | 3: the data-quality form test, the preset name test, the report presets sweep test | 2238 / 2237 / 0 / 1 | `0 399` |

Every task: `npx tsc --noEmit` clean; `npx eslint` on the task's files clean; full `npm run lint` after M11: 0 errors, 146 warnings (the baseline, all under `.agents/`). A Tailwind 4 compile of the sim's `globals.css` (`<temp>/m-tools/tw-mt.mjs`) emits `sm:mt-6.5` (`margin-top: calc(var(--spacing) * 6.5)` under `width >= 40rem`), `sm:mr-auto`, `sm:basis-auto` and `basis-full`.

What the rehearsal changed in this text:
- A test block appended through a shell heredoc lost its regex backslashes (M2); every block is written with a file tool, as the Global Constraints say.
- M2's "no disabled attribute" check first read `/\bdisabled=\{/`, which also matches `aria-disabled={`; it is `/(?<![\w-])disabled=\{/` (also in M10).
- M7: the role group's error is a `FieldError`, not a `Field error=`, so `roleIds` left the helper's `messages` list; the helper learned that the first checkbox of a group carries its id inside `id={…}`.
- M11: the preset name has no server step, so the helper gained `server: false`. Both helper changes are in M1's block, and the replay ran with them from M1.
- In the sim a `git stash` / `git stash pop` rewrote the LF test file as CRLF (`core.autocrlf`); the real run never stashes (Global Constraints), and Step 5's `eol.mjs` line catches it.
- Line numbers of the Changes tables were checked against `git show 71e5251:<file>` after the run (employee, asset model, admin user, department, integration and the two footers moved by one to four lines from the recon's).

Assembly check (`<temp>/sim-M`, branch `asm-m9`, commit `00c47000`, by `<tools>/asm-m9.mjs` on `m-replay`, A-R3): Task 27 (M9) moved onto Task 17's `FieldGroup` (F7's rehearsed file copied in). The M9 rows, test lines and `:244` pin above are that version: `node --test` of `v-track-m`, `integration-api-client-admin`, `admin-sweep-ui`, `form-migration-guards`, `validation-guards`, `visual-foundation-guards`, `choice-controls-ui`, `attachment-preview-dialog-ui`, `confirm-dialog-ui`, `phase2d-final-ui`, `list-pages-ui` and `accessible-dialog`: 184 tests, 0 fail; full `npm test` 2238 / 2237 / 0 / 1; `npx tsc --noEmit` clean; `npx eslint` clean on the four files. A first draft of the test's last check banned `FieldError`, which `useFieldErrors` contains; it bans `<FieldError\b`.

---

## Area S, one more task: the last duplicates and the employee's user account (Task 29a, S11)

The user's answers 2 and 3 (2026-10-17, "The user's answers" at the end) add this server task to plan 1. It sits after Task 29 so no earlier task's number changes, and before Task 30, which checks it on the app. It needs only area S (Tasks 1–10: the shared body, `FieldRefusalError`, Task 8's and Task 9's import lines in the files it edits, and the test file's helpers `load`, `jsonRequest`, `stubDb`, `read`); it touches no form, because every key it sends is already in its form's table: role `name` (Task 26), branch `code` (Task 20), category `customFieldDefs.<i>.fieldName` (Task 23), integration `clientId` (Task 27), user `employeeId` (Task 25). It was rehearsed after the main dry run (header, "Dry run").

### Task 29a (S11): The last duplicates and the employee's user account land under their field (`src/app/api/admin/{roles,users,integration-clients}/**`, `src/app/api/branches/**`, `src/app/api/categories/**`, `src/lib/category-custom-field-names.ts`)

Spec §6.2 ("Duplicate values that end in a 500 today", the field refusals), §6.3; the user's answers 2 and 3; S-R5, S-R6, S-R7, S-R9, S-R13.

**Files:**
- Modify (CRLF): `src/app/api/admin/roles/[id]/route.ts`, `src/app/api/admin/users/route.ts`, `src/app/api/admin/users/[id]/route.ts`, `src/app/api/admin/integration-clients/route.ts`, `src/lib/api-error-catalog.ts`; `messages/th.json`, `messages/en.json` (through `scripts/messages-edit.mjs`)
- Modify (LF): `src/app/api/branches/route.ts`, `src/app/api/branches/[id]/route.ts`, `src/app/api/categories/route.ts`, `src/app/api/categories/[id]/route.ts`
- Create: `src/lib/category-custom-field-names.ts` (LF, new)
- Test: `tests/v-track-s.test.ts` (LF)

**Changes at 71e5251** (line numbers of `71e5251`, then where the line sits when this task runs, after Tasks 8 and 9 edited these files; find each site by its quoted text):

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `admin/roles/[id]/route.ts:6` (Task 9's line) | `import { fieldErrorResponse } from "@/lib/field-error-response"` | `import { fieldErrorResponse, uniqueConflictResponse } from "@/lib/field-error-response"` | S-R5 |
| `admin/roles/[id]/route.ts:29` (`:30`) | `    const isProtectedSystemAdmin = existing.name === "system_admin"` | it, then `    // A system role keeps its name; any other role renamed to a name another role holds is a duplicate (V track spec §6.2).` / `    if (!existing.isSystem) {` / `      const sameName = await prisma.role.findUnique({ where: { name: input.name }, select: { id: true } })` / `      if (sameName && sameName.id !== id) return uniqueConflictResponse("name", "Role name already exists")` / `    }` (before the permission lookup and the transaction, as the create checks at `admin/roles/route.ts:16-17`) | S-R13 |
| `branches/route.ts:55-57` (`:56-58`) | `        code: input.code,` / `        companyId: input.companyId,` / `        isActive: true,` (the `existingCode` lookup of the POST; the GET's `isActive: true,` at `:16` stays) | the `isActive: true,` line goes; above `    const existingCode = await prisma.branch.findFirst({` the line `    // Every branch of the company counts, inactive ones too: the unique index on (companyId, code) covers them all (V track spec §6.2).` | S-R13 |
| `branches/[id]/route.ts:59-62` (`:60-63`) | `        code: input.code,` / `        companyId: input.companyId,` / `        isActive: true,` / `        id: { not: id },` | the `isActive: true,` line goes; above `    const existingCode = await prisma.branch.findFirst({` the line `    // Every other branch of the company counts, inactive ones too: the unique index on (companyId, code) covers them all (V track spec §6.2).` | S-R13 |
| new file `src/lib/category-custom-field-names.ts` | — | exactly the block in Step 3 | S-R13 |
| `categories/route.ts:5-6`, `categories/[id]/route.ts:5-6` (Task 8's line 6) | `import { uniqueConflictResponse } from "@/lib/field-error-response"` | `import { fieldErrorResponse, uniqueConflictResponse } from "@/lib/field-error-response"`, then `import { duplicateCustomFieldNameErrors } from "@/lib/category-custom-field-names"` | S-R5 |
| `categories/route.ts:62-63` (`:66-67`) | `    })` / `    const category = existingInactiveCategory` (the end of the `existingInactiveCategory` lookup) | between them: `    // Two custom fields with one name break the unique index on the custom-field rows (V track spec §6.2). The rows are` / `    // written unless an inactive category with assets or models is brought back, which keeps its own.` / `    const writesCustomFields = !existingInactiveCategory \|\| (existingInactiveCategory._count.assets === 0 && existingInactiveCategory._count.models === 0)` / `    const fieldNameErrors = writesCustomFields ? duplicateCustomFieldNameErrors(input.customFieldDefs) : null` / `    if (fieldNameErrors) {` / `      return fieldErrorResponse({ status: 409, error: "Custom field names must be unique in a category", code: "DUPLICATE", fieldErrors: fieldNameErrors })` / `    }` | S-R13 |
| `categories/route.ts:72-74` (`:76-78`) | `            ...(existingInactiveCategory._count.assets === 0 && existingInactiveCategory._count.models === 0` / `              ? { customFieldDefs: buildCustomFieldDefsReplace(input.customFieldDefs) }` / `              : {}),` | `            ...(writesCustomFields ? { customFieldDefs: buildCustomFieldDefsReplace(input.customFieldDefs) } : {}),` (the same condition, named once) | — |
| `categories/[id]/route.ts` (`:68`, Task 8's line) | `    if (duplicate) return uniqueConflictResponse("code", "Category code already exists")` | it, then `    // Two custom fields with one name break the unique index on the custom-field rows, which a save writes again (V track spec §6.2).` / `    const fieldNameErrors = duplicateCustomFieldNameErrors(input.customFieldDefs)` / `    if (fieldNameErrors) {` / `      return fieldErrorResponse({ status: 409, error: "Custom field names must be unique in a category", code: "DUPLICATE", fieldErrors: fieldNameErrors })` / `    }` | S-R13 |
| `admin/integration-clients/route.ts:2` | `import { errorResponse } from "@/lib/api-response"` | it, then `import { prisma } from "@/lib/db"` and `import { uniqueConflictResponse } from "@/lib/field-error-response"` | S-R5 |
| `admin/integration-clients/route.ts:40` (`:42`) | `    const input = integrationClientCreateSchema.parse(await request.json())` | it, then `    // The client id is unique: one that exists is refused under its field before the client and its token are made (V track spec §6.2).` / `    const existing = await prisma.integrationApiClient.findUnique({ where: { clientId: input.clientId }, select: { id: true } })` / `    if (existing) return uniqueConflictResponse("clientId", "Integration client ID already exists")` | S-R13 |
| `admin/users/route.ts:107` (`:109`), `admin/users/[id]/route.ts:112` (`:113`) | `  if (existing) throw new Error("Employee already has a user account")` | `  if (existing) throw new FieldRefusalError("Employee already has a user account", { employeeId: "employeeHasUser" })` (both files import `FieldRefusalError` since Task 9; the status stays 400) | S-R6, S-R7 |
| `src/lib/api-error-catalog.ts:67` (`:70`), `:131` (`:136`) | `  "Custodian not found": "custodianNotFound",` · `  "Integration client not found": "integrationClientNotFound",` | after the first: `  "Custom field names must be unique in a category": "customFieldNameDuplicate",`; before the second: `  "Integration client ID already exists": "integrationClientIdExists",` (sorted places) | S-R13 |
| messages | — | change file `<temp>/s11-messages.json` (Step 3), prints `messages updated: 2 th, 2 en, 0 deleted`. Thai: `Client ID` on the admin pages (`docs/19_THAI_GLOSSARY.md:39`), `ชื่อ field` the category form's own label (`category.fieldName`) | glossary |

The role rename reuses the create's `Role name already exists` (`roleNameExists`), the branch keeps Task 9's Thai message and 400, the user keeps `employeeHasUser`; only the custom field names and the client id get new catalog keys (4090 → 4092 leaf keys per locale).

- [ ] **Step 1: The failing test.** Append to `tests/v-track-s.test.ts` (with a file tool):

```ts

test("the last duplicates and the employee's user account land under their field: role rename, inactive branch code, custom field names, client id (V spec §6.2)", async (t) => {
  t.mock.method(console, "error", () => {})
  type Create = { POST(request: Request): Promise<Response> }
  type Update = { PUT(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }
  const params = (id: string) => ({ params: Promise.resolve({ id }) })
  const expectBody = async (response: Response, status: number, body: unknown) => {
    assert.equal(response.status, status)
    assert.deepEqual(await response.json(), body)
  }

  // A role renamed to another role's name: 409 under the name, as the create answers, before anything is written.
  // A system role keeps its own name, so its update never looks.
  const role = await load<Update>("src/app/api/admin/roles/[id]/route.ts")
  const roleBody = { name: "store_keeper", displayName: "Store keeper", displayNameTh: "", description: "", isActive: true, permissionIds: ["perm-1"] }
  const storedRole = (isSystem: boolean) => ({ id: "role-1", name: "warehouse", isSystem, isActive: true, displayName: "Warehouse", displayNameTh: null, description: null, rolePermissions: [] })
  const invalidPermissions = { error: "Invalid permission selection", fieldErrors: { permissionIds: "invalidPermissionSelection" } }
  stubDb({ role: { findFirst: () => storedRole(false), findUnique: () => ({ id: "role-2" }) } })
  await expectBody(await role.PUT(jsonRequest("PUT", roleBody), params("role-1")), 409, { error: "Role name already exists", code: "DUPLICATE", fieldErrors: { name: "duplicate" } })
  stubDb({ role: { findFirst: () => storedRole(false), findUnique: () => ({ id: "role-1" }) }, permission: { findMany: () => [] } })
  await expectBody(await role.PUT(jsonRequest("PUT", roleBody), params("role-1")), 400, invalidPermissions)
  stubDb({ role: { findFirst: () => storedRole(true) }, permission: { findMany: () => [] } })
  await expectBody(await role.PUT(jsonRequest("PUT", roleBody), params("role-1")), 400, invalidPermissions)

  // A branch code an inactive branch of the same company holds: the check reads every branch, as the unique index does.
  const branches = await load<Create>("src/app/api/branches/route.ts")
  const branch = await load<Update>("src/app/api/branches/[id]/route.ts")
  const branchLookups: unknown[] = []
  stubDb({ branch: { findFirst: (args: { where: Record<string, unknown> }) => {
    branchLookups.push(args.where)
    return args.where.code ? { id: "branch-old", isActive: false, company: { code: "GL", nameTh: "จีลิงค์" } } : { id: "branch-1", isActive: true }
  } } })
  const branchBody = { code: "BKK", name: "Bangkok", companyId: "c1", address: "", contactPerson: "", isActive: true }
  const branchRefusal = { error: "รหัสสาขา BKK มีอยู่แล้วในบริษัท GL - จีลิงค์", fieldErrors: { code: "duplicate" } }
  await expectBody(await branches.POST(jsonRequest("POST", branchBody)), 400, branchRefusal)
  await expectBody(await branch.PUT(jsonRequest("PUT", branchBody), params("branch-1")), 400, branchRefusal)
  assert.deepEqual(branchLookups, [{ code: "BKK", companyId: "c1" }, { id: "branch-1", isActive: true }, { code: "BKK", companyId: "c1", id: { not: "branch-1" } }])

  // Two custom fields with one name in a category (the unique index on the custom-field rows): 409 under every row that
  // holds the name, compared trimmed and case-folded, on create and on update, before anything is written.
  const { duplicateCustomFieldNameErrors } = await load<typeof import("../src/lib/category-custom-field-names.ts")>("src/lib/category-custom-field-names.ts")
  assert.equal(duplicateCustomFieldNameErrors([{ fieldName: "cpu" }, { fieldName: "ram" }]), null)
  assert.deepEqual(duplicateCustomFieldNameErrors([{ fieldName: "a" }, { fieldName: "b" }, { fieldName: " A " }, { fieldName: "b" }]), {
    "customFieldDefs.0.fieldName": "duplicate", "customFieldDefs.1.fieldName": "duplicate", "customFieldDefs.2.fieldName": "duplicate", "customFieldDefs.3.fieldName": "duplicate",
  })
  const categories = await load<Create>("src/app/api/categories/route.ts")
  const category = await load<Update>("src/app/api/categories/[id]/route.ts")
  const customField = (fieldName: string) => ({ fieldName, fieldLabel: fieldName, fieldLabelTh: "", fieldType: "text", options: "", isRequired: false, sortOrder: 0, isActive: true })
  const categoryBody = { code: "IT", name: "IT", description: "", isActive: true, customFieldDefs: [customField("cpu"), customField("ram"), customField("CPU")], photoChecklist: [] }
  const fieldNameRefusal = { error: "Custom field names must be unique in a category", code: "DUPLICATE", fieldErrors: { "customFieldDefs.0.fieldName": "duplicate", "customFieldDefs.2.fieldName": "duplicate" } }
  stubDb({ assetCategory: { findFirst: (args: { where: Record<string, unknown> }) => (typeof args.where.id === "string" ? { id: "cat-1", isActive: true, _count: { assets: 0, models: 0 } } : null) } })
  await expectBody(await categories.POST(jsonRequest("POST", categoryBody)), 409, fieldNameRefusal)
  await expectBody(await category.PUT(jsonRequest("PUT", categoryBody), params("cat-1")), 409, fieldNameRefusal)
  // An inactive category with assets or models is brought back with its own rows, so the names it is sent are not written.
  assert.match(read("src/app/api/categories/route.ts"), /const fieldNameErrors = writesCustomFields \? duplicateCustomFieldNameErrors\(input\.customFieldDefs\) : null\n/)

  // An integration client id that exists: 409 under the client id, checked before the client and its token are made.
  const clients = await load<Create>("src/app/api/admin/integration-clients/route.ts")
  stubDb({ integrationApiClient: { findUnique: () => ({ id: "client-1" }) } })
  await expectBody(await clients.POST(jsonRequest("POST", { clientId: "finance-export", displayName: "Finance", scopes: ["asset:read"] })), 409, {
    error: "Integration client ID already exists", code: "DUPLICATE", fieldErrors: { clientId: "duplicate" },
  })

  // "Employee already has a user account" names the employee field on create and on update; the status stays 400.
  const users = await load<Create>("src/app/api/admin/users/route.ts")
  stubDb({ role: { findMany: () => [{ id: "role-employee", name: "employee", isActive: true, rolePermissions: [] }] }, user: { findUnique: () => null, findFirst: () => ({ id: "u-9" }) } })
  await expectBody(await users.POST(jsonRequest("POST", { username: "somchai", password: "a-strong-password", displayName: "Somchai", email: "", employeeId: "emp-1", roleIds: ["role-employee"], isActive: true })), 400, {
    error: "Employee already has a user account", fieldErrors: { employeeId: "employeeHasUser" },
  })
  const userUpdate = read("src/app/api/admin/users/[id]/route.ts")
  assert.match(userUpdate, /if \(existing\) throw new FieldRefusalError\("Employee already has a user account", \{ employeeId: "employeeHasUser" \}\)/)
  assert.doesNotMatch(userUpdate, /throw new Error\("Employee already has a user account"\)/)

  // The two new refusals have their catalog keys, in Thai and English.
  const { getApiErrorKey } = await load<typeof import("../src/lib/api-error-catalog.ts")>("src/lib/api-error-catalog.ts")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).apiErrors
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")).apiErrors
  for (const [error, key, thai] of [
    ["Custom field names must be unique in a category", "customFieldNameDuplicate", "ชื่อ field ต้องไม่ซ้ำกันในหมวดหมู่เดียวกัน"],
    ["Integration client ID already exists", "integrationClientIdExists", "Client ID นี้มีอยู่แล้ว"],
  ]) {
    assert.equal(getApiErrorKey(error), key)
    assert.equal(th[key], thai)
    assert.equal(en[key], error)
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-s.test.ts`. Expected to fail: "the last duplicates and the employee's user account land under their field: role rename, inactive branch code, custom field names, client id (V spec §6.2)" with `400 !== 409` at the first role check (the role update never looks the name up; it stops at the permission lookup, which the test gives no stand-in).
- [ ] **Step 3: Implement** per the Changes table (exact-string replacement; keep each file's line endings). Create `src/lib/category-custom-field-names.ts` (LF) with exactly:

```ts
import type { FieldErrors } from "./field-errors.ts"

// A category's custom fields have a unique index on (categoryId, fieldName) (prisma/schema.prisma), and a save writes
// every row of the template again, so two rows with one name are refused before the write, under each row that holds
// the name (V track spec §6.2). Names compare trimmed and case-folded, as SQL Server's default collations compare them.
export function duplicateCustomFieldNameErrors(customFieldDefs: readonly { fieldName: string }[]): FieldErrors | null {
  const rowsByName = new Map<string, number[]>()
  customFieldDefs.forEach((field, index) => {
    const name = field.fieldName.trim().toLowerCase()
    if (name) rowsByName.set(name, [...(rowsByName.get(name) ?? []), index])
  })
  const fieldErrors: FieldErrors = {}
  for (const rows of rowsByName.values()) {
    if (rows.length > 1) for (const index of rows) fieldErrors[`customFieldDefs.${index}.fieldName`] = "duplicate"
  }
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : null
}
```

  Save the change file `<temp>/s11-messages.json` (exact) and run `node scripts/messages-edit.mjs <temp>/s11-messages.json` (it prints `messages updated: 2 th, 2 en, 0 deleted` and keeps CRLF):

```json
{"set":{"th":{"apiErrors.customFieldNameDuplicate":"ชื่อ field ต้องไม่ซ้ำกันในหมวดหมู่เดียวกัน","apiErrors.integrationClientIdExists":"Client ID นี้มีอยู่แล้ว"},"en":{"apiErrors.customFieldNameDuplicate":"Custom field names must be unique in a category","apiErrors.integrationClientIdExists":"Integration client ID already exists"}}}
```

- [ ] **Step 4: Pin edits:** none. `tests/admin-role-routes.test.ts` stays green unchanged (its `@/lib/db` stand-in answers `role.findUnique` with `null`, so its PUT tests pass the new check), and so do `tests/admin-user-routes.test.ts`, `tests/integration-api-client-admin.test.ts` (the POST handler still calls `createIntegrationClient(` and `logAudit(` and names no `tokenHash`), `tests/api-error-catalog.test.ts` (the new `error:` literal and the `FieldRefusalError` message have their keys), `tests/category-delete-guard.test.ts` and Task 8's and Task 9's tests in `tests/v-track-s.test.ts`.
- [ ] **Step 5: Verify.** `node --test tests/v-track-s.test.ts tests/admin-role-routes.test.ts tests/admin-user-routes.test.ts tests/integration-api-client-admin.test.ts tests/api-error-catalog.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts tests/category-delete-guard.test.ts tests/rbac-route-matrix.test.ts tests/v-track-m.test.ts` (69 tests, 0 fail in the rehearsal); `npm test` (2255 tests, 2254 pass, 0 fail, 1 skipped; +1); `npx tsc --noEmit`; `npm run lint` (0 errors, 146 warnings, all under `.agents/`). Messages: 4092 leaf keys per locale. eol: `node <tools>/eol.mjs tests/v-track-s.test.ts src/lib/category-custom-field-names.ts src/app/api/branches/route.ts "src/app/api/branches/[id]/route.ts" src/app/api/categories/route.ts "src/app/api/categories/[id]/route.ts"` → `0 564`, `0 17`, `0 91`, `0 149`, `0 150`, `0 186`; the CRLF files print equal numbers (`119 119` roles `[id]`, `110 110` and `114 114` the user routes, `60 60` integration, `286 286` catalog, `4274 4274` each messages file).
- [ ] **Step 6: Commit.** `git add "src/app/api/admin/roles/[id]/route.ts" src/app/api/admin/users src/app/api/admin/integration-clients/route.ts src/app/api/branches src/app/api/categories src/lib/category-custom-field-names.ts src/lib/api-error-catalog.ts messages tests/v-track-s.test.ts`, then `git commit -m "fix(api): the last duplicates and the employee's user account land under their field (v-track plan 1 task 29a, S11)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

Rehearsal (2026-10-17, after the main dry run): `v-sim` branch `v-dry-29a` from `1cb49f80` (Task 29); every step as written; Step 2 failed with `400 !== 409` at the role check; no pin failed; commit `5224f0b0` (numstat: 86 lines added to the test, 17 to the new file, `10 4` the category create, `7 1` the category update, `6 1` the role update, `5 0` integration, `1 1` each branch and user route, `2 0` the catalog, `3 1` each messages file); `npm test` 2255 / 2254 / 0 / 1; `tsc` clean; lint 0 errors, 146 warnings. Task 31's commit `2b7ad8e1` then cherry-picked on top with Task 31's text as amended below (`887147bf`): the four docs test files 17 tests, 0 fail; numstat `21 1` / `14 0` / `1 1` / `32 0` (unchanged); `npm test` 2256 / 2255 / 0 / 1.

---

## Controller: verify and dev-app check (Task 30)

### Task 30: Verify, production build and dev-app check in both themes (controller runs this task, not an implementer)

**Files:**
- Create then delete: your own launch configuration in `.claude/launch.json` while the server runs (never committed; if the file already holds another session's configuration, add your own entry with its own name and port and remove only that entry afterwards; delete the file only if you created it).
- Evidence (git-ignored): `.superpowers/sdd/screenshots/v-track-plan1/after/`, `.superpowers/sdd/v-track-plan1/task-30-findings.md`.
- Modify: only files needed to fix problems found here. Each fix is a new small task with its own test through an implementer and the normal review, before Task 31; a fix never adds an `EXEMPT`, `V_SCOPE`, `NOT_IN_SCOPE` or `SELECT_STAR_ONLY` row without a ruling.

**Interfaces:**
- Consumes: Tasks 1–29 and 29a committed; Task 0's baseline, counts and before evidence.
- Produces: `task-30-findings.md`, which Task 31 turns into the "Dev-app check" and "Still open" bullets and their Thai counterpart.

- [ ] **Step 1: Verify.** Delete `.next/cache/turbopack` first (a stale Turbopack cache shipped old CSS before, wiki 47), then `npm run verify` (lint, tests, build). Record the test count (2255 tests, 2254 pass, 0 fail, 1 skipped with Task 29a in the rehearsal, before Task 31), lint (0 errors, 146 warnings, all under `.agents/`), `npx tsc --noEmit`, the build's page count. `git status --short` as in Task 0; every new file's line endings with `node <tools>/eol.mjs`.
- [ ] **Step 2: The built CSS.** In `.next/static/css/*.css`: the rules of `triggerInvalidClasses` (`data-invalid` with `border-danger`, and the `focus` and `aria-expanded` compounds with `border-ring`, F-R7), `sm:mt-6.5` (`margin-top: calc(var(--spacing) * 6.5)` under `sm`, M-R12), `basis-full`, `sm:basis-auto`, `sm:mr-auto` (M-R10), and the Button's `aria-disabled:` styles. A missing rule is a finding to fix before Step 4.
- [ ] **Step 3: Counting evidence after.** Run Task 0 Step 4's commands again into `task-30-counts/` and compare: `V_FORMS` 15 files (A-R5); `<form>` tags with `noValidate` in `src` 17 (checkin and the 16 plan-1 forms; `git grep -nE "<form[^>]*\bnoValidate\b" -- src`; a plain line count gives 33, because the forms' `validate()` comments name it); `SELECT_STAR_ONLY` 14 in 10 files and FMG `STAR_ONLY` 3 (A-R11); the toasts outside a catch: 61 in 19 files, Task 0's 62 minus the supplier's `toast.error(getErrorMessage(firstFieldError))` (`supplier-form.tsx:133`; the data-quality rules' toast sat in a bare `catch`, so it was never counted); `messages/th.json` 4092 leaf keys; `supplier-api-error`, `supplier-form-errors`, `getSupplierApiError`, `duplicate_code`, `invalid_email`, `too_long` nowhere in `src` or `tests` except Task 22's two `existsSync` lines and its `doesNotMatch` in `tests/v-track-m.test.ts`.
- [ ] **Step 4: Production server.**
  - Add a launch configuration `name: "asset-v1-start-3110"`, `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "start", "-p", "3110"]`, `port: 3110`, `autoPort: false` (another free port if 3110 is taken; say which in the findings), and start it with `preview_start`.
  - Confirm the dev database as in Task 0 Step 5 without opening `.env` (`/th/admin/readiness`); if anything suggests the production database, stop. Log in with the seed admin of `prisma/seed.ts`; do not echo the password. Use your own browser tab.
  - Prefer `waitUntil: "load"` plus a short wait over `networkidle`. Playwright code runs inline (`browser_run_code_unsafe`); a file you must create goes under `.playwright-mcp/` and is deleted right after the run.
- [ ] **Step 5: Write nothing (A-R8).** Count every POST, PUT, PATCH and DELETE from the moment you are logged in (the login's own requests are listed once, as the login), and report each with its route, status, body `code` and why it wrote nothing. A request you did not mean to send is a finding, reported with its status and whether it wrote.
  - **Allowed, because the server refuses before it writes** (checked against the routes at `71e5251`; the order is zod parse, then the check, then the write): a zod 400 (a body sent from the console with `fetch`, never from a form that would pass its own `validate()`); the category create with the code of an **active** category (Task 8's check before the write); a role create with an existing role name (`admin/roles/route.ts:16-17`, 409); an admin user create with an existing username, a valid password and roles you may grant (`assertUniqueUsername`, `admin/users/route.ts:55`, before the hash and the transaction); a branch create with the code of an **active** branch of the same company (`branches/route.ts:53-68`); an employee edit whose `managerId` is the URL's own id (`employees/[id]/route.ts:54`); a location edit whose `parentId` is the URL's own id (`locations/[id]/route.ts:57`); the state review's **resolve** with a 10-character reason and neither a status nor a condition (the schema's `refine`, `_form`); since Task 29a: a role edit (not a system role) with the name of another role on the roles list (`admin/roles/[id]/route.ts`, the name lookup before the permission lookup and the transaction, 409); a category create or edit with two custom field rows of one field name (the check before any write, 409; the duplicate is inside the request, so no existing value is needed); an admin user create with a new username, a valid password and an employee the users list shows with an account (`assertEmployeeAvailable`, before the hash and the transaction, 400).
  - **Before each allowed request**, read the existing value (the username, role name, code) off the list page on screen, and send the id from the address bar as it is. If you cannot see the value exist, or the request would differ from the list above in any way, skip the check and say so in the findings ("if a check would write, skip it").
  - **Never:** a duplicate company, department, employee, location, brand, model or supplier code (Tasks 7 and 8 answer those from the database's unique index during the write); a valid save of any form; the state review's **dismiss** with any reason of 10 characters or more (the same dialog; `dismiss/route.ts` writes on a valid reason); the review page's scan button (`POST …/scan` writes); the LDAP sync; an integration create, rotate, enable, disable or revoke; the data-quality save with valid values; a notification click (it may mark it read).
  - **The server path without a request:** intercept the form's request with `page.route(…)` and `route.fulfill` the body Tasks 7–9 send (for example 409 `{ error: "Brand name already exists", code: "DUPLICATE", fieldErrors: { name: "duplicate" } }`); `route.abort()` anything else on that route. An intercepted request never reaches the server; list it as "intercepted" in the count. Task 29a's integration client id that exists (a mistyped id would create a client and its token) and a branch code only an inactive branch holds (not on any list) go this way too: 409 `{ error: "Integration client ID already exists", code: "DUPLICATE", fieldErrors: { clientId: "duplicate" } }` and 400 `{ error: "รหัสสาขา … มีอยู่แล้วในบริษัท …", fieldErrors: { code: "duplicate" } }`.
  - The report preset name's save writes the browser's own storage, not the server: delete the preset you saved before you leave the page.
- [ ] **Step 6: Every plan-1 form, at 1440 and 375, light and dark** (Task 0 Step 7's list), screenshots to `after/<form>-<state>-<theme>-<width>.png`:
  - **Empty submit:** no browser bubble, no toast, no request; focus on the first wrong field of the form's `FIELD_IDS` order; under each wrong field its message (`common.validation.*`, or the form's own: the preset name's `labels.presetNameRequired`); the focused field's box (label to error line) inside `main`, 24px clear of the top edge and of the save bar (`getBoundingClientRect` against `main` and `[data-slot="sticky-form-footer"]`); in the accessibility tree the focused control's description holds its error, and no field error carries `role="alert"` or a live region (Review Focus 3, 4).
  - **Bad values:** too short (role key `a`, client id `ab`, password `short`, review reason `12345`: the message says the numbers, M-R4), badly formed (role key `Bad Key`, client id `a b`, email `x@`), and on the category an empty photo checklist row and an empty custom field name (the row's own field, M-R7).
  - **Clearing:** typing in a wrong field clears only its error; the employee's company change clears company, branch and department together; a role, permission or scope toggle clears its group's error; a new submit recomputes everything.
  - **Groups:** the admin roles and the role permissions focus their first checkbox with the error tied by `aria-describedby` (M-R8); the integration scopes (create and edit dialog) are `FieldGroup`s, uncheck every scope and save: the error under the group, focus on the first box, no request (A-R3, M-R11).
  - **Server refusals** (Step 5's allowed list and the intercepted bodies): each lands under its field with focus there, in a dialog inside the dialog (the integration edit's Notice stays for other failures; the state review's `_form` in its danger Notice, M-R9); an intercepted body that names no field of the form shows today's form-level message (the toast or the dialog Notice), once (Review Focus 1).
  - **Prerequisite gates:** the branch save without any company and the location save without any branch: intercept the list request (`GET`) with an empty list: the button is focusable, looks disabled, says why beside it (`aria-describedby`), and Enter sends nothing (M-R10).
  - **The two new forms:** the data-quality rules save through the button, and through Enter where the browser submits on it from a select or a checkbox (note which; an intercepted `PUT` only), and its refusal shows the server's reason (M-R12); the preset name saves with Enter in the field (open issue 7), its error sits under the field and the button does not move (`sm:mt-6.5`, at 640px and wider).
- [ ] **Step 7: The shared parts.** The asset form's live duplicate check (`/th/assets/new`, type an existing asset tag and serial, do not save): the error under the field, read once through the polite region, not twice (F-R6). The SearchableSelect error look: on a later-plan form that already passes `error=` to a `SearchableSelect`, or by setting `data-invalid` on a trigger in the browser's inspector: danger border and halo at rest, teal ring while focused and while open, in both themes and with forced colors (F-R7). Forced colors and reduced motion on two plan-1 forms: the error text and the field border show; focus scrolls without animation (F-R5).
- [ ] **Step 8: Findings.** Write `task-30-findings.md` with these parts (Task 31 copies them):
  - **Fixes made:** commit and one line each, or "none".
  - **Checked and passed:** what, where, in which themes and widths, with results; the counts of Step 3; the built CSS of Step 2; the verify numbers of Step 1; every request of Step 5 with its status.
  - **Differences from Task 0's before evidence:** each mapped to a decision of this plan (any other is a finding to fix).
  - **Found but not caused by this plan.**
  - **For the user:** screenshots for the user's answers (5: the 17 messages under real fields, which the user reads on these screenshots; 6: the shared duplicate text under the username, the branch code and the role name (Step 5's allowed refusals) and under the supplier code and the client id (intercepted); 3: "Employee already has a user account" under the employee field; 7: the preset name saved with Enter) and anything else to decide.
  - **Still needs a person:** NVDA on one master-data form and one dialog (one announcement per submit, the group errors), real phones (iOS Safari and Android Chrome: focus scrolls the field clear of the keyboard and the save bar), an English pass of the new messages.
- [ ] **Step 9: Clean up.** Stop your server, remove your launch configuration and every helper you put under the repo. `git status --short` shows only the untracked folders and files of the Global Constraints. No commit in this task unless Step 8 lists fixes (each its own task).

---

## The docs (Task 31)

### Task 31: V track plan 1 in the handoff and the changelog (`DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`)

Spec §9 ("a handoff section and a changelog entry per plan"); the shape of Dark Mode's Task 23 (D3). The record of this plan: the handoff section before `## Open Go-Live Decisions` (H2), the 2C note that promised `fieldErrors` points at it (H3), the Thai changelog entry first under the newest date (C1, or C1b on a later date), the handoff's header date (H1, only on a later date). The Dark Mode record test's changelog-order assertion moves with it (P1), as Dark Mode's D-R5 moved the 2D-5 one.

**Files:**
- Modify: `DEVELOPER_HANDOFF.md` (`i/lf w/crlf`), `docs/99_CHANGELOG.md` (`i/lf w/crlf`), `tests/dark-mode-docs.test.ts` (`i/lf w/crlf`; one assertion)
- Create: `tests/v-track-docs.test.ts` (LF, new; one test)
- Read: `.superpowers/sdd/v-track-plan1/task-30-findings.md` (Task 30, git-ignored) and the user's answers to the open issues 1–7 ("The user's answers (2026-10-17)" at the end of this plan; H2 below already holds them). If the findings file is missing, stop and report before editing anything: never write the dev-app check text without it.

**Interfaces:** produces `## V Track Plan 1 (<today>)` with a `- Dev-app check:` bullet, and `### ข้อความผิดพลาดใต้ช่องกรอก รอบ 1 (งาน V plan 1)` with a `- **ตรวจบนแอป:**` bullet; Task 32 inserts the verify bullet directly above each.

**Changes at the end of Task 29a** (the files are as `71e5251` left them; no task before this one edits them):

| Id | Line | What changes | Rule |
|---|---|---|---|
| H1 | `DEVELOPER_HANDOFF.md:3` | `> Last updated: 2026-10-17` → `> Last updated: <today>`, only if `<today>` is not 2026-10-17 | — |
| H2 | `DEVELOPER_HANDOFF.md:1072` | this plan's section, before `## Open Go-Live Decisions` (after the Dark Mode section) | spec §9 |
| H3 | `DEVELOPER_HANDOFF.md:390` | the 2C ZodError note's last line points at this section | spec §6.1 |
| C1 | `docs/99_CHANGELOG.md:9` | the entry, above the Dark Mode entry under `## 2026-10-17` (C1b instead when `<today>` is another date) | spec §9, `docs/19_THAI_GLOSSARY.md` |
| P1 | `tests/dark-mode-docs.test.ts:124` | the Dark Mode entry is no longer the first under the newest date: the assertion finds it under 2026-10-17 | Dark Mode D-R5 |

**(H2)** :1072, the plan's own section, before Open Go-Live Decisions. Replace:

```
## Open Go-Live Decisions
```

with

```
## V Track Plan 1 (<today>)

- Branch `feat/v-track` in the main checkout (from `master` `9e17cab`: phase 2D and Dark Mode merged, not deployed, plus the spec's commit `71e5251`). Spec `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` (the user's decisions U1–U9) · plan `docs/superpowers/plans/2026-10-17-v-track-plan1.md` (plan 1 of the track: the server, the shared foundation, and the master-data and admin forms).
- No migration, database write, schema or dependency change (`react-hook-form` stays unused). No server rule was added (spec §6.3): every refusal existed, only its body gained `fieldErrors`. Messages (through `scripts/messages-edit.mjs`): +29 keys (`apiErrors.recipientRequired`, seven duplicate keys `apiErrors.companyCodeExists` … `categoryCodeExists`, `apiErrors.customFieldNameDuplicate`, `apiErrors.integrationClientIdExists`, the 17 `common.validation.*`, `branch.saveNeedsCompany`, `location.saveNeedsBranch`) and −4 (`apiErrors.invalidSupplierData`, `supplier.duplicateCode`, `supplier.invalidEmail`, `supplier.fieldTooLong`): 4067 → 4092 keys.
- **The 400 (Tasks 1–2):** every route's `ZodError` answers `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors }` (`validationFailedBody(error, keyFor?)` in `src/lib/api-error-exposure.ts`, through `errorResponse` and the transaction-cancellation helper). `fieldErrors` holds one code per field under its dotted zod path (`customFieldDefs.0.fieldName`), `_form` for an issue with no path; the first issue of a field wins. Codes (`src/lib/field-errors.ts`, `issueToFieldErrorCode`): a message the api-error catalog knows becomes its catalog key (`endBeforeStart`, `handoverModeRequired`, `licenseSeatsExceeded` …); otherwise `required`, `tooShort`, `tooLong`, `outOfRange`, `invalidDate`, `invalidNumber`, `invalidEmail`, `invalidFormat`, `invalidChoice` or `invalid` (S-R2's table). The module has no `@/` import, so tests and client code import it.
- **Special keys (Tasks 4–6):** the settings route keys an issue by the submitted setting (`settings.asset_label_12_width_mm`, `settingFieldKeyFor`); the asset batch by row or common part (`rows.<i>.<field>`, `common.<field>`; the per-row parse is re-keyed, `assetBatchItemIssuePath`), and its duplicate serials and tags put `duplicate` under every row holding one; checkout's `HANDOVER_*` and disposal execution's evidence branch keep their `code` and add `fieldErrors`.
- **Field refusals and duplicates (Tasks 2, 7–10, 29a):** `FieldRefusalError(message, fieldErrors, status = 400)` (thrown by a helper, answered by `errorResponse`), `fieldErrorResponse({ status, error, fieldErrors, code? })` and `uniqueConflictResponse(field, error)` (409, `code: "DUPLICATE"`) in `src/lib/field-error-response.ts`, which re-exports `isPrismaUniqueConstraintError`. Duplicates that ended in a 500 answer 409 under their field on create and update: company, department, employee and location `code`, brand and model `name` (from the unique index, `P2002`), and category `code` (checked before writing). The §6.2 refusals name their field: username, password, role name (409), permissions, branch code, manager, parent, serial number, purchase document number, checkout condition, status correction status, PM vendor, assignee; the import file rules go under `_form`. The last duplicates that ended in a 500 answer under their field too (Task 29a): a role renamed to another role's name (409 under `name`), a branch code an inactive branch of the company holds (the check reads every branch), two custom fields with one name in a category (409 `DUPLICATE` under each row's `customFieldDefs.<i>.fieldName`, `src/lib/category-custom-field-names.ts`) and an existing integration client id (409 under `clientId`); "Employee already has a user account" goes under `employeeId` (`employeeHasUser`, 400). Supplier is on the shared body and codes (`src/lib/supplier-api-error.ts`, `src/lib/supplier-form-errors.ts` and their tests are gone). The recipient rule of a disposal has its catalog key `recipientRequired`, and `tests/api-error-catalog.test.ts` reads `message:` literals too. Integration v1 (`src/app/api/integrations/v1/**`, `integrationErrorResponse`) is unchanged.
- **The client (Tasks 11–17):** the rule helpers `src/lib/validation-rules.ts` (`required`, `minLength`, `maxLength`, `range`, `email`, `pattern`, `notBefore`, `atLeastOne`, each a code or `null`); `common.validation.*` and the resolver `src/lib/field-error-client.ts` (`common.validation` first, then `apiErrors`, then `common.validation.invalid`); `src/lib/field-focus.ts` (focus the first wrong field and scroll `main` so it shows whole, 24px clear of the topbar and the sticky save bar); the hook `useFieldErrors` / `useValidationMessage` (`src/components/ui/use-field-errors.ts`: `setErrors`, `applyServer`, `clear`, `message`, `focusFirst`); `FieldError` without `role="alert"` (one announcement per submit: focus reads the field with its error) and `Field liveError` (a polite live region for errors shown while typing; the asset form's duplicate tag and serial); the SearchableSelect error look (`data-invalid` and `triggerInvalidClasses`, teal again while focused or open; `MaintenanceOptionSelect` and `AuditScanCheckField` pass `id` and `error` on); `FieldGroup` (`src/components/ui/field-group.tsx`).
- **The forms (Tasks 19–29):** brand, branch, category (its custom field and photo rows too), company, department, employee, location, asset model, supplier, the admin user, the role, the integration client create and edit, the asset state review dialog, the data-quality rules and the report preset name: `noValidate` straight after `onSubmit`, a module-level `validate()` that restates every constraint the controls carry, errors under the field (a group: one error), focus on the first wrong field, the server's `fieldErrors` on the same fields, no validation toast (a refusal that names no field keeps today's message). Content gates became errors on submit (the review reason's 10 characters, at least one integration scope); the branch and location saves without a company or a branch stay gated, `aria-disabled` with the reason beside the button. The integration create and edit, and the data-quality rules, show the server's reason instead of a fixed text. The data-quality rules and the report preset name became `<form>`s.
- **Guards and pins:** `tests/validation-guards.test.ts` (`V_SCOPE` 51 forms in 44 files, `NOT_IN_SCOPE` 2, `V_FORMS` 15 files, `SELECT_STAR_ONLY` 14 required selects in 10 files that count down; rules V1–V5; reader `tests/helpers/validation-reader.ts`). FMG's `STAR_ONLY` (3) and `CONSTRAINT_FLOORS` did not change; no `EXEMPT` row or owner was added. The pins that encoded the old behaviour were rewritten in the commit that changed it (the forms' UI tests, `tests/field-primitives.test.ts`, `tests/asset-forms-ui.test.ts`, `tests/api-error-exposure.test.ts`, `tests/api-error-catalog.test.ts`, the sweep tests).
- **Tests:** new files `tests/v-track-s.test.ts` (11), `tests/v-track-f.test.ts` (7), `tests/validation-guards.test.ts` (6), `tests/v-track-m.test.ts` (11) and `tests/v-track-docs.test.ts` (1); deleted `tests/supplier-api-error.test.ts` (4) and `tests/supplier-form-errors.test.ts` (2); 2226 → <N> tests.
- **Rulings of this plan:** R1 (the earlier rulings), R2 (the server, S-R1–S-R13), R3 (the foundation, F-R1–F-R10), R4 (the forms, M-R1–M-R14), R5 (assembly, A-R1–A-R11).
- **The user's answers to the open issues (2026-10-17):** 1 the category update duplicate stays in (409 under the code); 2 the four remaining duplicates are fixed in Task 29a; 3 "Employee already has a user account" goes under the employee field (Task 29a); 4 the disposal evidence domain errors are decided in the disposal plan; 5 the 17 `common.validation` messages as drafted, read on Task 30's screenshots; 6 a duplicate shows the shared text "ข้อมูลนี้มีอยู่แล้วในระบบ" under its field (also for supplier, username, role name and branch code); 7 Enter saves the report preset name.
- **Not taken:** `react-hook-form`, `aria-invalid` on the SearchableSelect's button (it is a `<button>`), an alert role per field error, a new server rule, a `STAR_ONLY` or `SELECT_STAR_ONLY` change (their selects are in later-plan forms).
- **Handed on:** the later plans of the track, in order: the asset forms (the batch's `rows.<i>` keys, the date pairs, the license seats), the operations forms, the audit forms, the disposal and maintenance forms, the settings form and the prefix editor (`settings.<key>`, `reveal` for the tabs), then the final plan (DESIGN.md's form-error rule, `docs/14_UI_UX_DESIGN_SYSTEM.md`); then the E2E suite and the one deploy (wiki 27).
- Dev-app check: <from task-findings>
- Before/after screenshots: `.superpowers/sdd/screenshots/v-track-plan1/before/` and `after/` (git-ignored, on the development machine only).
- Still open, for a person before the one deploy: <from task-findings>, together with the open checks of the sections above.
- Next: merge this branch; then V track plan 2 (the asset forms) and the later plans, the E2E suite and the one deploy (wiki 27).

## Open Go-Live Decisions
```

**(H3)** :390, the 2C ZodError note's last line. Replace:

```
  - Routes are unchanged. The V track adds `fieldErrors` to this body.
```

with

```
  - Routes are unchanged. V track plan 1 added `fieldErrors` to this body (see "V Track Plan 1" below).
```

**(C1)** :9, the entry, first under `## 2026-10-17` (C1b instead when `<today>` is another date). Replace:

```
### โหมดมืด (Dark Mode)
```

with

```
### ข้อความผิดพลาดใต้ช่องกรอก รอบ 1 (งาน V plan 1)

Branch `feat/v-track` (จาก `master` `9e17cab`) · design `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` · plan `docs/superpowers/plans/2026-10-17-v-track-plan1.md` (plan แรกของงาน V)

- **ขอบเขต:** ฝั่ง server ทั้งหมด ชิ้นส่วนกลางของฟอร์ม และฟอร์มข้อมูลหลักกับฟอร์มของผู้ดูแลระบบ 16 ฟอร์ม · ไม่แตะฐานข้อมูล ไม่มี migration ไม่เพิ่ม dependency ไม่เพิ่มกฎใหม่ฝั่ง server · ข้อความ: เพิ่ม 29 คีย์ ลบ 4 คีย์ ผ่าน `scripts/messages-edit.mjs` (4067 → 4092)
- **server:** ข้อมูลที่กรอกไม่ถูกต้องตอบ 400 พร้อม `fieldErrors` บอกรหัสความผิดพลาดของแต่ละช่อง (ชื่อช่องเป็น path คั่นด้วยจุด เช่น `customFieldDefs.0.fieldName` ความผิดพลาดที่ไม่ใช่ของช่องใดอยู่ใต้ `_form`) · ตั้งค่าระบบใช้ชื่อช่อง `settings.<key>` · เพิ่มทรัพย์สินหลายรายการใช้ `rows.<i>.<field>` และ `common.<field>` และบอก Serial หรือรหัสทรัพย์สินที่ซ้ำทีละแถว · ข้อความที่ server ตั้งใจส่งใช้ key ของ catalog เป็นรหัส · รหัสหรือชื่อซ้ำในบริษัท แผนก พนักงาน ที่ตั้ง ยี่ห้อ รุ่น และหมวดหมู่ ตอบ 409 ใต้ช่องนั้นแทน 500 ทั้งตอนเพิ่มและตอนแก้ไข · ชื่อผู้ใช้ซ้ำ รหัสผ่าน ชื่อบทบาทซ้ำ สิทธิ์ รหัสสาขาซ้ำ หัวหน้างาน ที่ตั้งแม่ Serial ซ้ำ เลขเอกสารซื้อซ้ำ และอื่น ๆ ตามข้อ 6.2 ของ spec บอกช่องของตัวเอง · บทบาทที่เปลี่ยนชื่อไปซ้ำกับบทบาทอื่น รหัสสาขาที่สาขาซึ่งไม่ใช้งานแล้วถืออยู่ ชื่อ field ที่ซ้ำกันในหมวดหมู่เดียวกัน และ Client ID ที่มีอยู่แล้ว ตอบใต้ช่องนั้นแทน 500 · พนักงานที่มีบัญชีผู้ใช้อยู่แล้วแสดงใต้ช่องพนักงาน · ผู้ขายใช้รูปแบบเดียวกับทุกหน้า · Integration API v1 ไม่เปลี่ยน
- **หน้าจอ:** ฟอร์มยี่ห้อ สาขา หมวดหมู่ (รวมแถวช่องข้อมูลและแถวรายการรูป) บริษัท แผนก พนักงาน ที่ตั้ง รุ่น ผู้ขาย ผู้ใช้ บทบาท Integration client (สร้างและแก้ไข) dialog พิจารณาสถานะทรัพย์สิน กฎคุณภาพข้อมูล และชื่อชุดตัวกรองรายงาน แสดงข้อความผิดพลาดใต้ช่องกรอก ไม่ใช้ toast แจ้งการกรอกผิด ไม่มีกล่องเตือนของเบราว์เซอร์ · กดบันทึกแล้วไปที่ช่องแรกที่ผิดและเลื่อนให้เห็นทั้งช่อง ไม่ถูกแถบด้านบนหรือแถบบันทึกบัง · server ปฏิเสธช่องไหนก็แสดงใต้ช่องนั้น · แก้ช่องแล้วข้อความของช่องนั้นหายไป · เหตุผลการพิจารณาที่สั้นกว่า 10 ตัวอักษรและ Integration client ที่ไม่เลือกขอบเขตเลยแจ้งตอนกดบันทึกแทนการปิดปุ่ม · บันทึกสาขาเมื่อยังไม่มีบริษัทและบันทึกที่ตั้งเมื่อยังไม่มีสาขายังรอเหมือนเดิม แต่บอกเหตุผลข้างปุ่ม · Integration client และกฎคุณภาพข้อมูลแสดงเหตุผลจาก server แทนข้อความตายตัว
- **ชิ้นส่วนกลาง:** ฟังก์ชันตรวจกฎที่คืนรหัส (`src/lib/validation-rules.ts`) · ข้อความกลาง `common.validation.*` 17 คีย์ · hook `useFieldErrors` · ข้อความผิดพลาดใต้ช่องไม่ประกาศทีละช่องอีก (กดบันทึกหนึ่งครั้งประกาศครั้งเดียวผ่านช่องที่ได้โฟกัส) ช่องที่ตรวจขณะพิมพ์ใช้ `liveError` · ช่องเลือกแบบค้นหาได้มีขอบสีของข้อผิดพลาดและกลับเป็นสีเขียวน้ำทะเลตอนโฟกัส · `FieldGroup` สำหรับกลุ่มตัวเลือก
- **test:** ไฟล์ใหม่ `tests/v-track-s.test.ts` (11), `tests/v-track-f.test.ts` (7), `tests/validation-guards.test.ts` (6), `tests/v-track-m.test.ts` (11), `tests/v-track-docs.test.ts` (1) · ลบ `tests/supplier-api-error.test.ts` (4) และ `tests/supplier-form-errors.test.ts` (2) · guard ใหม่ล็อกฟอร์มทั้ง 51 ฟอร์มของงาน V (ย้ายแล้ว 15 ไฟล์) · test 2226 → <N>
- **deploy:** ไม่ deploy · deploy ครั้งเดียวหลังงาน V ครบทุก plan และชุด E2E
- **ตรวจบนแอป:** <จาก task-findings>
- ภาพก่อน/หลัง: `.superpowers/sdd/screenshots/v-track-plan1/before/` และ `after/` (git ignore อยู่บนเครื่องพัฒนา)
- ต่อไป: merge แล้วทำงาน V plan 2 (ฟอร์มทรัพย์สิน) และ plan ที่เหลือ แล้วชุด E2E และ deploy ครั้งเดียว

### โหมดมืด (Dark Mode)
```

**(C1b, only if `<today>` is not 2026-10-17, instead of C1)** Replace the line `## 2026-10-17` (the only one) with `## <today>`, a blank line, C1's new text without its last line (the entry from `### ข้อความผิดพลาดใต้ช่องกรอก รอบ 1 (งาน V plan 1)` to its `- ต่อไป:` bullet), a blank line, `---`, a blank line and `## 2026-10-17`.

- [ ] **Step 1: The failing test.** Create `tests/v-track-docs.test.ts` (LF) with exactly (with a file tool):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// V track plan 1, the docs (task 31): the handoff section and the Thai changelog entry record the plan in place, with
// every marker filled. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the handoff and the changelog record V track plan 1 in place, with every marker filled (v-track plan 1 task 31)", () => {
  const handoff = read("DEVELOPER_HANDOFF.md")
  const section = handoff.indexOf("\n## V Track Plan 1 (")
  assert.ok(section > handoff.indexOf("\n## Dark Mode ("), "the V track plan 1 section follows the Dark Mode one")
  assert.ok(section < handoff.indexOf("\n## Open Go-Live Decisions"), "and comes before Open Go-Live Decisions")
  const record = handoff.slice(section, handoff.indexOf("\n## Open Go-Live Decisions"))
  assert.match(record, /\n- Dev-app check: \S/, "the dev-app check bullet")
  // The body as validationFailedBody sends it, and the 2C note that promised fieldErrors points here.
  assert.ok(record.includes('`{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors }`'), "the 400 body")
  assert.match(read("src/lib/api-error-exposure.ts"), /code: "VALIDATION_FAILED", fieldErrors: issuesToFieldErrors\(error\.issues, keyFor\)/)
  assert.ok(handoff.includes('\n  - Routes are unchanged. V track plan 1 added `fieldErrors` to this body (see "V Track Plan 1" below).\n'), "the 2C note")
  const changelog = read("docs/99_CHANGELOG.md")
  const newest = changelog.indexOf("\n## ")
  const entry = changelog.indexOf("\n### ข้อความผิดพลาดใต้ช่องกรอก รอบ 1 (งาน V plan 1)\n")
  assert.ok(newest !== -1 && entry !== -1, "the newest date and the V track plan 1 entry")
  assert.equal(changelog.indexOf("\n### ", newest), entry, "the entry is the first one under the newest date")
  assert.ok(entry < changelog.indexOf("\n### โหมดมืด (Dark Mode)\n"), "above the Dark Mode entry")
  assert.match(changelog.slice(entry, changelog.indexOf("\n### ", entry + 1)), /\n- \*\*ตรวจบนแอป:\*\* \S/, "the dev-app check bullet")
  // Every marker of the template is filled; a failure lists the path and the markers left.
  const markers = /<today>|<N>|<from task-findings>|<จาก task-findings>/g
  for (const [path, text] of [["DEVELOPER_HANDOFF.md", handoff], ["docs/99_CHANGELOG.md", changelog]]) {
    assert.deepEqual([path, text.match(markers) ?? []], [path, []])
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-docs.test.ts`. Expected to fail: "the handoff and the changelog record V track plan 1 in place, with every marker filled (v-track plan 1 task 31)" ("the V track plan 1 section follows the Dark Mode one").
- [ ] **Step 3: Implement.**
  - H2, H3 (and H1 on a later date) in `DEVELOPER_HANDOFF.md`; then C1 in `docs/99_CHANGELOG.md` if `<today>` is 2026-10-17 (the newest date at `71e5251`), otherwise C1b (one of the two, never both).
  - If `.superpowers/sdd/v-track-plan1/task-30-findings.md` does not exist, stop and report (Task 30 has not run or wrote no findings); never invent the `<from task-findings>` or `<จาก task-findings>` text. (The dry run had no Task 30 and wrote one placeholder sentence there; the marker test passes either way, so the test does not catch this.)
  - Fill the markers: `<today>` (`YYYY-MM-DD`); `<N>` (the test count after this commit: Task 30's verify count + 1 for this task's test, 2256 in the rehearsal with Task 29a; the same number Task 32's verify bullets record); `<from task-findings>` with the findings file in English, in the shape of the Dark Mode section's "Dev-app check" bullet (server, port, commit, what passed with numbers, every request of Task 30 Step 5 with its status, the differences from Task 0 and their decisions, fixes or "no fixes"), and the "Still needs a person" and "For the user" parts in the "Still open" bullet as sub-bullets; `<จาก task-findings>` with the same in Thai, glossary words, as the Dark Mode entry's "ตรวจบนแอป" bullet does.
  - H2's "**The user's answers to the open issues (2026-10-17):**" bullet holds the user's answers, as the Dark Mode section does; say the same in the Thai entry's "ตรวจบนแอป" bullet. If the user answers anything more before this task runs, add it to both.
- [ ] **Step 4: Pin edit:**

**(P1)** :124, `tests/dark-mode-docs.test.ts`, the Dark Mode record test: the V track plan 1 entry is now the first under the newest date. Replace:

```
  assert.equal(changelog.indexOf("\n### ", newest), entry, "the entry is the first one under the newest date")
```

with

```
  assert.equal(changelog.lastIndexOf("\n## ", entry), changelog.indexOf("\n## 2026-10-17\n"), "the entry sits under 2026-10-17 (the V track plan 1 entry went above it later, v-track plan 1 task 31)")
```

  The old string occurs once in `tests/dark-mode-docs.test.ts` (its twin in `tests/phase2d-docs.test.ts` was rewritten by Dark Mode's D-R5). Its `newest` constant stays in use (the `assert.ok` above it).
- [ ] **Step 5: Verify.**
  - `node --test tests/v-track-docs.test.ts tests/dark-mode-docs.test.ts tests/phase2d-docs.test.ts tests/audit-round-cancellation.test.ts` (17 tests, 0 fail in the dry run; the last reads both files for the round cancellation words, which stay). Without P1 the Dark Mode record test fails with "the entry is the first one under the newest date" (the dry run checked it).
  - `grep -n "<today>\|<N>\|<from \|<จาก " DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md` → nothing.
  - `node <tools>/eol.mjs DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md tests/dark-mode-docs.test.ts tests/v-track-docs.test.ts` → equal numbers for the first three (`132 132` for the pin file) and `0 32` for the test; `git diff --numstat` → only the three edited files (the new test is untracked until Step 6 adds it), `1 1 tests/dark-mode-docs.test.ts`, the handoff at least `21 1`, the changelog at least `14 0` (the findings add lines; the dry run, with one-line placeholder findings, gave `21 1`, `14 0` and eol `1108 1108`, `1917 1917`, and so did the rehearsal with Task 29a and this text, `887147bf`). On a later `<today>` (H1 and C1b) the handoff is at least `22 2` and the changelog at least `18 0` (rehearsed with `2026-10-18` on the dry run's Task 31 result: eol `1108 1108`, `1921 1921`, and the four test files above 17 tests, 0 fail; the date assertions of `tests/phase2d-docs.test.ts` and `tests/dark-mode-docs.test.ts` look for `\n## 2026-10-17\n`, which C1b keeps).
  - `npm test` (2256 tests, 2255 pass, 0 fail, 1 skipped; +1, rehearsed with Task 29a); `npx tsc --noEmit`; `npm run lint` (0 errors, 146 warnings, all under `.agents/`).
- [ ] **Step 6: Commit.** `git add DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md tests/dark-mode-docs.test.ts tests/v-track-docs.test.ts`, then `git commit -m "docs(forms): V track plan 1 in the handoff and the changelog (v-track plan 1 task 31)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 32: Final verification, wiki and memory (controller runs this task)

**Files:**
- Modify: `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md` (verify numbers)
- Modify (vault `D:\Obsidian\Eltross`): `AssetSystem/ams-status.md`, `AssetSystem/ams-log.md`, `AssetSystem/ams-open-questions.md`, and any page that states the old 400 body or the supplier error codes (find them with `grep -rln "VALIDATION_FAILED\|duplicate_code\|Invalid supplier data" AssetSystem`)
- Modify (auto-memory): `review-2026-10-priorities.md`, `dark-mode-track.md` (its "next: the V track" line), and a V-track memory file (create it if none exists), with `MEMORY.md`'s one-line entries in step

- [ ] **Step 1: Verify.**
  - Run `npm run verify` and record the test count (2256 tests with Task 31's test, 2255 pass, 0 fail, 1 skipped in the rehearsal with Task 29a) and the build page count.
  - Add the line ``- `npm run verify` ผ่าน (test N · ผ่าน N · ข้าม 1 · build X/X หน้า)`` to the plan's changelog entry, directly above its `- **ตรวจบนแอป:**` bullet (numbers with thousands commas, as the Dark Mode entry writes `test 2,226`).
  - Add the line ``- Verification: `npm run verify` passes (tests N · pass N · skipped 1 · build X/X pages).`` to the handoff section, directly above `- Dev-app check:`.
  - Both files are CRLF in the working tree: insert with an exact-string edit that writes `\r\n` (the Edit tool, or a Node script; `sed -i` in Git Bash writes LF). `node <tools>/eol.mjs DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md` → equal numbers for each; `git diff --numstat` → `1 0` for each.
  - Run `npm test` again (Task 31's test still passes: the verify bullets add no marker; the same count as above), then `git add DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md` and `git commit -m "docs(forms): record v-track plan 1 verify results" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
- [ ] **Step 2: Wiki.** Read `AssetSystem/_schema/ams-wiki-schema.md` first, then edit:
  - `ams-status.md`: V track plan 1 is built on `feat/v-track` with the verify numbers, not merged, not deployed; the next step is plan 2 (assets) of the track. Fix any sentence the row now contradicts (the 400 body without `fieldErrors`, the supplier-only codes, "validation errors are toasts").
  - `ams-log.md`: an entry at the top of `## <today>`.
  - `ams-open-questions.md`: item 27's order line shows the V track in progress (plan 1 ✓); the user's answers to the open issues 1–7 (2026-10-17; answer 4 goes on the disposal plan's list); Task 30's "Still needs a person" list as one item.
  - The pages found above: the body and codes as they are now, with `sources` pointing at `src/lib/field-errors.ts`, `src/lib/api-error-exposure.ts` and `src/lib/field-error-response.ts`, and `confidence` as the schema says for a page checked against the code.
  - A new page (only if a fact has no page yet) gets its line in `ams-index.md` and an `ams-` name that no other page of the vault holds; every page you touch keeps `status` / `verified` / `confidence` / `sources`, with `sources` real paths of the repo.
  - Then run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` from `D:\Obsidian\Eltross` (0 errors), and commit only the files you edited with an `ingest:` message (`git -C D:/Obsidian/Eltross add <each file>`, then `git -C D:/Obsidian/Eltross commit -m "ingest: v-track plan 1 built (field errors: server, foundation, master-data and admin forms)"`). Never stage other sessions' changes in the vault.
- [ ] **Step 3: Memory.** The V-track memory: plan 1 built on `feat/v-track` (S, F and the master-data and admin forms), not merged, not deployed; next the later plans (assets; operations; audit; disposal and maintenance; settings; then the final plan with DESIGN.md), then E2E, then the one deploy. Update `review-2026-10-priorities.md` and `dark-mode-track.md` to the same order. Keep `MEMORY.md`'s one-line entries in step.
- [ ] **Step 4: Finish** with superpowers:finishing-a-development-branch. The spec merges each plan of the track in order (§9): a local merge fast-forwards `master` (`git merge --ff-only feat/v-track` from `master`) and runs the tests on the merged result. No push and no merge without the user.

---

## Spec coverage

Plan 1's scope is spec §6 (all), §7.1–§7.3, the guards of §8, and the forms #34–#44, #47–#50 and #52. A row that says "later plans" is outside plan 1 by the computed task, and this plan leaves its tools ready.

| Spec | What it asks | Where in this plan |
|---|---|---|
| §2 U1 | Errors under the wrong field; the page goes to the first one | Tasks 13, 14 (focus and scroll); Tasks 19–29 (`focusFirstError`); settings tab switching: the settings plan (`reveal`, F-R4) |
| §2 U2 | No validation toasts; toasts stay for other failures | Task 18 V3; every M test (`assertMigratedForm`: no `toast.error`/`toast.warning`); Task 22 (the supplier's toast goes); the catches keep `apiError.toast` (M-R4) |
| §2 U3 | `fieldErrors` in every route's 400; Integration v1 unchanged | Task 2 (through `errorResponse` and the cancellation helper, with its Integration v1 pin); Tasks 4–6 for the routes that build their own 400 |
| §2 U4 | Date pairs | the assets and audit plans (`notBefore` is ready, Task 11) |
| §2 U5 | Every form in one round | plan 1 of the round; the scope list is Task 18's `V_SCOPE` (51 forms) |
| §2 U6 | Errors after save, not while typing; a field's error clears when it changes | F-R4 (`setErrors` on submit only, `clear`); M-R5 (`setField` clears its key); no plan-1 task adds a live check |
| §2 U7 | No new dependency; one hook plus `validate()` per form | Tasks 11–14; M-R2; Global Constraints ("The server", "Off limits") |
| §2 U8 | Live warnings stay live, under the field; a save shows nothing twice | Task 15 (`Field liveError`; the visible line is hidden from reading so it is read once; the asset form's two duplicates); the settings boxes, the prefix editor and the batch warning: later plans |
| §2 U9 | Dotted keys and `_form`; one code set, supplier on it; 409 duplicates on create and update; other non-zod refusals | Tasks 1, 2, 4, 5 (keys); 1, 7, 22 (codes, supplier); 8, 29a (409); 9, 10, 29a (refusals) |
| §3 G1 | Every §5 form: errors under the fields, focus on submit | Tasks 19–29 for the 16 plan-1 forms; the other 35: later plans |
| §3 G2 | The server's 400 carries `fieldErrors`; forms map them | Tasks 2–10; `applyServer` in every M task (M-R4) |
| §3 G3 | Content gates become errors; prerequisites keep a gate with a reason | Tasks 27, 28 (scopes, review reason; M-R11); Task 20 (branch and location; M-R10) |
| §3 G4 | The custom server messages reach the person | Task 1 (catalog keys as codes), Task 12 (the resolver reads `apiErrors`), Task 3 (the one missing key) |
| §3 G5 | One announcement per submit; both themes; forced colors | Task 15; Task 16 (the select look by tokens); Task 30 Steps 6–7 |
| §3 non-goals | No new live validation; no new server rule; Integration v1 and the login form unchanged; `react-hook-form` unused; offline-queued scans as today | U6 row; Global Constraints ("The server", no dependency); Task 2's pin; Task 18 `NOT_IN_SCOPE` (login); the audit plan (offline scans; no plan-1 task touches them) |
| §3 anti-goals | Silent refusals; toast plus error; live box plus error; the bubble; a hidden wrong field; five alerts | Review Focus 1, 5, 4, 3; `noValidate` (FIXED 6, V2); tabs, `<details>` and review steps: `focusField` opens `<details>` (Task 13), tabs and steps in later plans |
| §4.1 | On submit: validate, server, form-level fallback, other failures unchanged | M-R4 (steps 1–2); F-R4 and M-R4's `applyServer(…) && focusFirst(…)` falls through to today's form-level message (step 3); the catches, Notices and the state review's stale toast stay (step 4, M-R9) |
| §4.2 | Tabs, review dialogs, steps, the mobile sheet | `reveal` and `waitForElement` (Tasks 13, 14); Task 28 (the state review dialog is the form itself: it stays open with the refusal inside it, M-R9); the checkout, checkin, transfer and batch review steps, the multi-step flows and the audit sheet (`focusField` keeps the browser's own scroll outside `main`, F-R5): later plans |
| §4.3 | Clearing per field and per group; a new submit recomputes | M-R5; `setErrors` replaces the map (F-R4); Task 21 (company clears three), Task 23 (rows), Tasks 25–27 (groups) |
| §4.4 | Content rules vs prerequisites; every inventory row classified | M's inventory "Decision" column classifies every plan-1 row; M-R10 (prerequisites: branch, location), M-R11 (content: review reason, scopes); the other gates of §4.4: later plans |
| §4.5 | `noValidate`; the attributes stay; `validate()` restates them through the rule helpers | FIXED 6, V2; M-R2 (each `validate()` restates `required`, `minLength`, `maxLength`, `pattern`, `type="email"`); FMG `CONSTRAINT_FLOORS` unchanged (F-R10) |
| §5 plan-1 forms | #34 brand, #37 company, #38 department · #35 branch, #40 location · #39 employee · #42 supplier · #36 category · #41 asset model · #43 admin user · #44 role · #47, #48 integration create and edit · #49 state review · #50 data-quality rules, #52 preset name | Task 19 · 20 · 21 · 22 · 23 · 24 · 25 · 26 · 27 · 28 · 29 (M's inventory; `V_FORMS` 15 files, 16 forms, A-R5) |
| §5 counts | 52 forms; 38 toasts, 14 silent returns, 21 disabled gates, 15 asterisk-only selects, one `noValidate`; the bugs | `V_SCOPE` 51 (the 52 minus the login form, Task 18). Plan 1's share: none of the 38 client toasts (supplier's toast answers the server, Task 22); 2 of the silent returns (the integration scope rules, Task 27); 4 of the gates (integration edit and state review become errors, branch and location keep a gate with a reason); none of the asterisk-only selects. The spec's 15 selects: its recon list (`recon-2.md`, "SearchableSelect with only an asterisk") names 14 places, and V5's `SELECT_STAR_ONLY` locks those 14 in 10 files. Bugs: the integration message (Task 27), the bare `catch` (Task 29); checkin, bulk move and disposal request: later plans |
| §6.1 | The body, keys, codes, the two special routes, supplier | Tasks 1, 2 (body, codes, keys), 4 (settings keys), 5 (batch keys), 6 (special routes), 7 and 22 (supplier) |
| §6.2 | The non-zod refusals; the 500 duplicates | Tasks 5 (batch duplicates per row), 9, 10 (the listed refusals; the import rules under `_form`); Task 8 (409 on create and update, category's active duplicate; answer 1); Task 29a (the duplicates §6.2 does not name that ended in a 500: a role renamed to another role's name, an inactive branch's code, two custom fields of one name, an existing integration client id; and "Employee already has a user account" under `employeeId`; answers 2 and 3, S-R13) |
| §6.3 | Only the recipient key; no other server rule | Task 3; Global Constraints ("The server") |
| §7.1 | `common.validation.*`; domain messages stay; custom codes through the catalog | Task 12 (17 keys, F-R2; wording: open issue 5); M-R4 (the preset keeps its own required text); F-R3 (`apiErrors` after `common.validation`) |
| §7.2 | One hook, rule helpers that return codes, `validate()` per form, existing disposal helpers reused | Tasks 11, 14; M-R2; the disposal helpers: the disposal plan |
| §7.3 | `Field`/`FieldError`, SearchableSelect, groups, `SignaturePad` unchanged, the error look | Tasks 15, 16, 17 (A-R3; `ChoiceCard` and `Segmented` as F-R8); `SignaturePad` is not touched; the look by tokens in both themes and forced colors (Task 16; Task 30 Step 7) |
| §7.4 | Date pairs | the assets and audit plans |
| §8 | No dependency, migration or database write; messages through the script; the V guards; FMG floors and `STAR_ONLY`; pins in the same commit; no line-ending test, real characters; the process | Global Constraints; Tasks 0 and 30 Step 5 (no write); each message task; Task 18 (V1–V5); F-R10 and A-R11 (`STAR_ONLY` reaches empty in the later plans of the round); each Step 4; the header's dry run, one task one commit, the controller's review, Task 30 on a production build; the server first (Tasks 1–10) |
| §9 | Order of work | Architecture (S, F, M); later plans; Task 31 (handoff, changelog) and Task 32 (wiki); DESIGN.md, docs/14 and `.impeccable/design.json`: the final plan |
| §10 | Left to the builder | the header's "Left to the builder (§10), decided here" |
| §11 calls 1–9 | 1 `noValidate` · 2 gates · 3 keys · 4 one code set · 5 409 duplicates · 6 client-only date pairs · 7 form-level fallback · 8 license seats asterisk · 9 the preset name in, login out | 1 FIXED 6 · 2 M-R10, M-R11 · 3 S-R3, S-R4 · 4 S-R2, Tasks 7, 22 · 5 Tasks 8, 29a · 6 the assets plan (no server rule here, §6.3) · 7 F-R4, M-R4 · 8 the assets plan · 9 Task 29, Task 18's `NOT_IN_SCOPE` |

## The user's answers (2026-10-17)

The user answered the seven open issues on 2026-10-17. Each answer is what the tasks write; answers 2 and 3 added Task 29a (S11, S-R13), and the drafted issues stay below for the record.

1. **Category update duplicates:** kept. The category update answers 409 under the code, like the create (Task 8, S-R8).
2. **The four duplicates that still ended in a 500:** fixed in Task 29a: a role renamed to another role's name, a branch code an inactive branch holds, two custom fields with one name in a category, an integration client id that exists.
3. **"Employee already has a user account":** under the employee field in Task 29a, `fieldErrors: { employeeId: "employeeHasUser" }`, with its status (400).
4. **Disposal execution's evidence domain errors:** decided in the disposal plan.
5. **The 17 `common.validation` messages:** as drafted (Task 12's change file); the user reads them under real fields on Task 30's screenshots.
6. **The text of a duplicate under its field:** the shared text "ข้อมูลนี้มีอยู่แล้วในระบบ" (`common.validation.duplicate`), for supplier, username, role name and branch code too, and for Task 29a's duplicates.
7. **Enter saves the report preset name:** kept.

### Open issues as drafted

Each default is what the tasks write; an answer that differs changes the task named. None blocks execution, and only issues 1, 5, 6 and 7 change what plan 1 ships.

1. **Category update duplicates (area S, open issue 1).** Spec §6.2 names only the category create (an active duplicate). The category update hits the same unique index and also ends in a 500 today; Task 8 (S8) answers it with the same 409 under `code` (S-R8). **Default: keep it in.** Recommendation: keep (the same 500, the same fix, checked before writing). The other way limits Task 8 to the create (its test's update lines go).
2. **Duplicates that still end in a 500, not named by §6.2** (area S issue 2, area M issue M-a): renaming a role to a name that exists (`admin/roles/[id]` PUT, `prisma/schema.prisma:990`); a branch code an **inactive** branch of the same company holds (the check reads active branches, the index covers all); a category with two custom fields of the same field name (`@@unique([categoryId, fieldName])`, `schema.prisma:482`); an integration client id that exists (`UX_integration_api_clients_clientId`, `schema.prisma:1066`; `createIntegrationClient` in `src/lib/integration-client-store.ts:205` has no check). Each would land under its field with no form change, because the key is already in the form's table. **Default: not in plan 1** (they keep their 500). Recommendation (area M): add them in one more S task before plan 2, with the same 409 pattern (`name`, `code`, `customFieldDefs.<row>.fieldName`, `clientId`).
3. **"Employee already has a user account"** (`admin/users/route.ts:107`, `admin/users/[id]/route.ts:112`, catalog key `employeeHasUser`; area S issue 3, M-a): a field refusal §6.2 does not list. **Default: it stays a toast.** Recommendation (area M): `fieldErrors: { employeeId: "employeeHasUser" }` through one `FieldRefusalError` per route in Task 9; the admin user form already has the key.
4. **Disposal execution's evidence rules** (area S issue 4): the service refuses the reason under 20 characters and the missing acknowledgement as `DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED` / `_ACK_REQUIRED` domain errors, not zod; Task 6's zod branch fires only for a reason over 2000 characters. **Default: decided in the disposal plan** (its form checks both in `validate()`, spec §4.4). Recommendation: yes, the disposal plan's server task attaches `fieldErrors` to those two domain errors, so a refusal lands under the reason and the acknowledgement like every other; nothing in plan 1 depends on it.
5. **The wording of the 17 `common.validation` messages** (area F, F-a; spec §10 leaves it to the builder): required "กรุณาระบุข้อมูลนี้"; tooShort "ต้องมีอย่างน้อย {min} ตัวอักษร"; tooLong "ต้องไม่เกิน {max} ตัวอักษร"; outOfRange "ต้องอยู่ระหว่าง {min} ถึง {max}"; invalidDate "วันที่ไม่ถูกต้อง"; invalidNumber "กรุณากรอกเป็นตัวเลข"; invalidEmail "รูปแบบอีเมลไม่ถูกต้อง"; invalidFormat "รูปแบบไม่ถูกต้อง"; invalidChoice "กรุณาเลือกจากรายการ"; duplicate "ข้อมูลนี้มีอยู่แล้วในระบบ"; endBeforeStart "วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น"; invalid "ข้อมูลไม่ถูกต้อง"; and the five plain or one-sided siblings (Task 12's change file). **Default: as written.** Recommendation: keep, and read them under real fields on Task 30's screenshots. A change edits Task 12's change file and its test's table.
6. **The text of a duplicate under its field** (area M, M-b, widened in the final review): spec §6.1 makes `duplicate` the code; it does not say which sentence a form shows. Every plan-1 form shows `common.validation.duplicate` "ข้อมูลนี้มีอยู่แล้วในระบบ" under the field. Today the toast says more: supplier "เลขประจำตัวผู้เสียภาษีหรือรหัสผู้ขายนี้มีอยู่แล้ว", username "ชื่อผู้ใช้นี้มีอยู่แล้ว", role name "ชื่อบทบาทนี้มีอยู่แล้ว", branch code, for example "รหัสสาขา BKK มีอยู่แล้วในบริษัท GL - จีลิงค์" (it names the company that holds the code); the duplicates of Task 8 read "Unexpected error · ref …" today. **Default: the shared text.** Recommendation: keep it: the field it sits under says what is duplicated, and for a branch the company is the one chosen in the same form. The other way: a form shows its own catalog message for `duplicate` on that key (one line per form, like the preset's required text; Task 22's message delete and test change for supplier).
7. **Enter saves the report preset name** (M-R12, not in the spec): the preset name becomes a `<form>` (spec §4.5 and §8 want `noValidate` on every form of the scope), so Enter in the name field saves the preset, which today does nothing. The data-quality rules become a `<form>` the same way; their controls are selects and checkboxes, so they save from the button as today, and Enter saves only where the browser submits on it. **Default: keep.** Recommendation: keep (the save is local to this device and can be deleted; Enter-to-save is what every other form does).

### Behaviour changes a person would notice beyond the spec

Everything else a person sees change is a decision of the spec (errors under the field, no validation toast, focus, the gates of §4.4, the server's reason for the integration client and the data-quality rules). Beyond it:
- The text of a duplicate is the shared sentence, shorter than today's toast for supplier, username, role name and branch code (open issue 6).
- Enter saves the report preset name (open issue 7).
- A category renamed to the code of another category answers 409 under the code instead of a 500 (open issue 1).
- Task 29a (answers 2 and 3): a role renamed to another role's name, two custom fields with one name (every row that holds it; names that differ only in case count as one, S-R13) and an integration client id that exists answer 409 under their field instead of a 500; a branch code an inactive branch holds answers the same 400 under the code as an active branch's code; "Employee already has a user account" shows under the employee field instead of a toast.

Checked, no change a person would see outside plan 1's forms: `FieldError` loses its alert role everywhere (Task 15), but at `71e5251` only the supplier form (Task 22) and the asset form's two live duplicates (`liveError`, polite) pass an `error` to `Field`, and no caller passes one to `SearchableSelect`; the new `fieldErrors` key and the 409 `code: "DUPLICATE"` are ignored by every form not yet moved, which keep showing `payload.error` as today.
