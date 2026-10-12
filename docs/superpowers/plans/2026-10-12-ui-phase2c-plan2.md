# UI Round 4 · Phase 2C Forms and Dialogs · Plan 2 (batch 2: master-data forms) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the 8 master-data forms of batch 2 (branch, brand, category, company, department, employee, location, supplier) onto the 2A and 2C primitives. Workflows, pages, data and validation behavior stay the same; the supplier form keeps its 6 errors under fields, now through `Field error=`.

**Architecture:**
- **No new primitives.** Plan 1 merged everything batch 2 needs: `Field`, `Input`, `NativeSelect`, `Textarea`, `checkboxVariants`, `Button` with `busy`, `FieldRequiredMark` and `preventEnterSubmit`.
- **One file is one commit (I30).** Each of Tasks 1–8 migrates one form. In the same commit it lowers that file's budgets in `tests/form-migration-guards.test.ts` and adds the file to `MIGRATED_FILES`, so the old patterns cannot come back.
- **Budget edits go through a temp script.** Task 1 defines `p2c-budget.mjs` in the implementer's temp folder (never committed), and Tasks 2–8 reuse it.
- **Controller tasks:** Task 0 (base check and before screenshots), Task 9 (verify, production build and dev-app check) and Task 11 (verify numbers, wiki and memory). Task 10 writes the repo docs.

**Tech Stack:** Next.js 16.4 App Router · Tailwind CSS 4.2.4 · class-variance-authority 0.7.1 · tailwind-merge 3.5 (through `cn()`) · next-intl 4 · `node --test` with Node 24 type stripping.

**Spec:** `docs/superpowers/specs/2026-10-11-ui-phase2c-design.md`, with section details in `docs/superpowers/specs/2026-10-11-ui-phase2c/03-primitives.md` … `09-guards-tests.md`.
- **Spec §10 (rulings I1–I36) overrides the section files wherever they conflict.** This plan already applies them; when a task and a section file disagree, the task wins.
- Batch 2 is spec §8.9 "ชุด 2" (8 files · 46 fields · 9 checkboxes · 44 `Field` calls · 26 buttons · 8 `Loader2`) and §10.3 "plan 2".
- Plan 1 (`docs/superpowers/plans/2026-10-11-ui-phase2c-plan1.md`) built the primitives and the guard file this plan uses. Its Task 14 (`asset-model-form.tsx`) is the closest model for these forms.

**Task numbering:** Task 0 and Tasks 9 and 11 are controller tasks. Tasks 1–8 are one form each, in the order of the `"2"` row of `BATCH_FILES`. Task 10 is the repo docs.

## Global Constraints

- **Git:**
  - Work on branch `feat/ui-phase2c-plan2`, created from `master` `4daf0b9` (2A and 2C plan 1 merged and pushed, not deployed).
  - Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase` or `git clean`, and never touch the `master` branch.
  - Commit only the files your task names. One migrated file is one commit (I30).
  - End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Next.js 16.4** is not the Next.js in your training data. Read `node_modules/next/dist/docs/` before using an API you have not seen in this repo.
- **Line endings:**
  - `git config core.autocrlf` is `true`.
  - The 8 forms, `tests/supplier-form-ui.test.ts`, `tests/master-data-return-navigation.test.ts` and the four docs files of Task 10 are CRLF in the working tree.
  - `tests/form-migration-guards.test.ts` is **LF**.
  - Before you edit a file, run `git ls-files --eol <file>` and keep what it uses. Edit with exact-string replacement; never normalize a file.
  - Tests that read source files strip `\r` (`.replace(/\r\n/g, "\n")`) before multi-line regexes. `tests/supplier-form-ui.test.ts` reads its file without stripping, so no new regex in it may contain `\n`.
- **Tests:**
  - `npm test` runs `node scripts/run-tests.mjs` over `tests/**/*.test.{ts,mjs,js}` with Node 24 type stripping. Run one file with `node --test tests/<file>.test.ts`.
  - Modules that tests import use relative `.ts` imports (no `@/`) and erasable TypeScript only.
  - Tests cannot import `.tsx`; they check `.tsx` by reading the source text.
  - Use the shared helpers in `tests/helpers/source-files.ts` (`readSourceFiles`, `findMatches`, `countMatchesByFile` and the JSX reader).
- **Baseline before Task 1** (HEAD `4daf0b9`, or this plan's commit on top of it, which changes only `docs/`):
  - `npm test`: 1802 tests, 1801 pass, 0 fail, 1 skipped.
  - `npx tsc --noEmit`: clean.
  - `npm run lint`: 0 errors and 146 warnings, all under `.agents/`.
  - Task 0 re-checks these numbers.
- **Every task ends with all of these green:**
  - `npm test` (0 fail)
  - `npx tsc --noEmit` (no errors)
  - `npm run lint` (0 errors, no new warnings in `src/` or `tests/`)
  - Report any failure by name.
- **Off limits:**
  - Do not run `npm ci`, `npm install`, `npm run build`, the dev server, `npx shadcn …`, or anything against a database.
  - Do not read or print `.env` or `.env.prod-admin`.
  - Leave the untracked paths alone: `.codex/`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/` and `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`.
  - Do not run skill helper scripts (for example the impeccable launcher); they make network calls.
- **No new tokens (I21).** No task adds a custom property to `:root`, `@theme inline` or `@theme`, and no task edits `tests/design-tokens-contrast.test.ts`. Every class uses existing tokens and 2A primitives. Never write `rounded-[…]`.
- **Field migration rules (spec §4, §10.1):**
  - `Field label=` is the first prop.
  - `required`, `maxLength` and `minLength` stay on the control inside `Field` (K4). `Field` only adds the star and `aria-required`. Guard GF5 (`CONSTRAINT_FLOORS`) counts them per file, and the counts never go down.
  - Fields use `fieldSize` (`md` 36 · `lg` 40 · `xl` 48); the default is `lg`. Desktop heights of 44px become 40 (K7).
  - Phones keep ≥44px with 16px text through the 2A recipe.
  - Errors under fields stay only where they exist today: the 6 supplier fields. No other form in batch 2 gains one.
- **No validation behavior change.**
  - Keep every existing `toast.error` guard, every `disabled` gate and every native check.
  - Field errors on other forms, focus on the first invalid field and `common.validation.*` belong to the V track.
- **Buttons (2A contract):**
  - Use `Button` / `buttonVariants`. Use `busy={x}` for work in progress and remove `x` from `disabled` on the same element (K13; guard GB4).
  - A busy button keeps its label (no "กำลัง..." swaps).
  - `destructive` is for solid confirms; `danger` is for in-page destructive actions.
- **Messages:**
  - Edit `messages/th.json` and `messages/en.json` only through `node scripts/messages-edit.mjs <changes.json>`, run from the repo root. Keep the JSON in your temp folder.
  - Thai follows `docs/19_THAI_GLOSSARY.md` and must pass `tests/thai-glossary.test.ts`. Every key exists in both files (`tests/messages-parity.test.ts`).
- **Tests that must keep passing without edits** (spec §9.7 row 2, §4.16):
  - `tests/master-data-return-navigation.test.ts` (every form keeps its `returnTo` wiring)
  - `tests/ui-overlay-guards.test.ts` (it reads `supplier-form.tsx`)
  - `tests/supplier-form-ui.test.ts:8-13` (`type="tel"`, `inputMode="tel"`, the three `autoComplete` values and `min-h-11`) and its unsaved-changes and message-key tests
  - The only existing test lines this plan changes are `tests/supplier-form-ui.test.ts:18-20` (spec §4.16, Task 8). New tests go in new files or are appended (Task 8).
- **Out of scope for plan 2:**
  - **2B:** the master-data list pages, `supplier-list-view.tsx`, filters and list toolbars.
  - **Not in 2C:** `master-data-layout.tsx`, `supplier-purchase-documents.tsx`, the `*-delete-button.tsx` files, and `asset-model-form.tsx` (done in plan 1 Task 14).
  - **Batch 5:** the look of the `useConfirm` dialog the supplier form opens for unsaved changes.
  - **2D:** form panel frames (K28) and notices.
  - **V track:** all validation UX.
- **Deploy:** no task in this plan deploys. On 2026-10-12 the user decided to deploy once, after **all** of phase 2 is done (2C plans 2–5, 2B, 2D and the V track). This overrides the "every batch deploys on its own" lines in spec §8.9 and §10.3.

## Review Focus

1. **A user who saves a master-data form with a required field left empty** must still be stopped exactly as today, by the browser's native check or the existing toast. Moving a control into `Field` must not drop `required`, `maxLength` or `minLength`. Pinned by guards GF4 and GF5 (`CONSTRAINT_FLOORS`), which every task keeps green, and by the precheck in each task.
2. **A user whose supplier save fails on the server** (duplicate code, bad email, a value too long) must see the message under the right field, announced at once, with the field marked invalid. Pinned by the Task 8 rewrite of `tests/supplier-form-ui.test.ts:18-20` (6 `Field error=` sites, all 6 field ids, no local `Field` or `errorId`). Checked on the dev app in Task 9 with a duplicate code, which writes nothing.
3. **A user who clicks Save and then clicks again, or presses Enter, while it saves** must not send a second request, and keyboard focus must stay on the busy button. Pinned by guard GB4 (no `disabled={x}` next to `busy={x}`) and GB3 (the label does not change). Checked with the keyboard in Task 9.
4. **A user who toggles a checkbox on a phone** must be able to click the label text to toggle the box. The supplier "active" row (`min-h-11` today) and the category "required field" rows (one of the 9 small targets of spec §4.12, now `min-h-11`) are at least 44px tall; the other seven "active" rows are ~38px boxes (group B2) and keep their height (§4.12, ruling 14 of §4). Pinned by `tests/supplier-form-ui.test.ts:13` (`min-h-11`), `tests/category-form-ui.test.ts` (the `min-h-11` row) and each task's checkbox assertion. Checked at 375 in Task 9.
5. **A user who opens a form from a filtered list and then saves or cancels** must land back on the same filtered list. Pinned by `tests/master-data-return-navigation.test.ts`, which every task keeps green without edits. Checked once on the dev app in Task 9 with Cancel, which writes nothing.

## File structure

| File (`src/components/master-data/`) | What changes | Task |
|---|---|---|
| `branch-form.tsx` | 5 fields, 1 checkbox, 2 buttons onto the shared parts | 1 |
| `brand-form.tsx` | 1 field, 1 checkbox, 2 buttons | 2 |
| `category-form.tsx` | 9 fields, 2 checkboxes, 12 buttons (the photo checklist's up, down, duplicate and remove buttons `:509-545`, `CustomFieldTemplateEditor`) | 3 |
| `company-form.tsx` | 6 fields, 1 checkbox, 2 buttons | 4 |
| `department-form.tsx` | 3 fields, 1 checkbox, 2 buttons | 5 |
| `employee-form.tsx` | 10 fields, 1 checkbox, 2 buttons | 6 |
| `location-form.tsx` | 6 fields, 1 checkbox, 2 buttons | 7 |
| `supplier-form.tsx` | 6 fields with their errors moved into `Field error=`, 1 checkbox, 2 buttons | 8 |
| `tests/form-migration-guards.test.ts` | each task lowers its own file's budgets and adds it to `MIGRATED_FILES` | 1–8 |
| `tests/<form>-form-ui.test.ts` for branch, brand, category, company, department, employee and location (new, LF) | one UI test file per form, like `supplier-form-ui` (spec gap: the guards only count old patterns) | 1–7 |
| `tests/supplier-form-ui.test.ts` | `:18-20` rewritten per spec §4.16, and 1 test appended | 8 |
| `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` | plan 2 documentation | 10, 11 |

---

### Task 0: Base check and before screenshots (controller runs this task, not an implementer)

**Files:**
- Create then delete: `.claude/launch.json` (only if no dev server is running; never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2c-plan2/before/` (git-ignored)

**Interfaces:**
- Consumes: HEAD before Task 1.
- Produces: the base check, the baseline numbers, and the before images Task 9 compares against.

- [ ] **Step 1: Check the base.**

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2c-plan2`

Run: `git merge-base --is-ancestor 4daf0b9 HEAD && git diff --quiet 4daf0b9 HEAD -- src tests messages scripts && echo BASE-OK`
Expected: `BASE-OK`

If it does not print `BASE-OK`, code changed after `4daf0b9` (for example 2B landed first). The budgets and the old snippets in Tasks 1–8 may then be stale.
- Before you dispatch each of those tasks, re-run the task's precheck.
- Where a count or a snippet differs, update the task text and record a ruling in the ledger.

- [ ] **Step 2: Baseline.** Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: 1802 tests (1801 pass, 0 fail, 1 skipped); tsc clean; lint 0 errors and 146 warnings, all under `.agents/`. Record the numbers in the ledger.

- [ ] **Step 3: Confirm the dev database.** Read the `.env` keys `DATABASE_URL` and `DB_USER` without printing secrets. The database must be `asset_management_dev` and the user `asset_dev`. If not, stop.

- [ ] **Step 4: Open the app.**
  - If the user's dev server answers on `http://localhost:3000`, use it.
  - Otherwise create `.claude/launch.json` (`runtimeExecutable: "npm"`, `runtimeArgs: ["run", "dev"]`, `port: 3000`) and run `preview_start`.
  - Log in with the seed admin from `prisma/seed.ts`; do not echo the password.

- [ ] **Step 5: Pick the edit ids.** Open each list page (`/th/master-data/branches`, `brands`, `categories`, `companies`, `departments`, `employees`, `locations`, `suppliers`) and take the id from the first row's edit link. For categories, pick a row whose edit page shows at least two items in the photo checklist, if one exists. Record the ids in the ledger.

- [ ] **Step 6: Before screenshots.**
  - Save to `.superpowers/sdd/screenshots/ui-phase2c-plan2/before/` as `<entity>-<new|edit>-<width>.png`, for example `supplier-edit-375.png`.
  - Take full-page shots, and for the `main` scroll area also a shot scrolled to its bottom.
  - At 1440 and 375: the 8 `/th/master-data/<section>/new` pages and the 8 `/th/master-data/<section>/<id>/edit` pages.
  - At 768: `category-edit`, `employee-new` and `supplier-new` (the widest two-column grids).
  - Do not save any form.

- [ ] **Step 7: Clean up.**
  - Stop any server you started and delete `.claude/launch.json`.
  - Run `git status --short`; it must show only the untracked paths in Global Constraints.
  - No commit in this task.

---

### Task 1: Batch 2 · `master-data/branch-form.tsx` (and the precheck and budget scripts that later tasks reuse)

Spec §8.9 "ชุด 2" row `branch-form.tsx`, with §4.3 (F1–F8), §4.4 (L1, `branch-form.tsx:197` ×5), §4.6, §4.12 (checkbox `branch-form.tsx:166`), §4.14 (the row, and note "2": `resize-none` at `:160`), §6.3 #127–#128, §6.7 (cancel links and the F1 row), §9.4 (seeds), §10.1 and §10.3 "plan 2". One file, one commit (I30). The form is CRLF; edit it with exact-string replacement only.

Rulings this task applies:
- **K4, GF5:** `required` stays on code, name and company, and `maxLength` stays on all four text controls (20, 200, 200, 500). `Field required` goes on exactly the three fields whose control has `required` (F5, GF4).
- **K13, §6.3 #128:** Save is `busy={saving}` and keeps `disabled={companies.length === 0}`. With no company to pick, the form still cannot be saved. GB4 checks that `disabled` no longer repeats `saving`.
- **§4.14 note "2":** the address textarea loses `resize-none` and gets the 2A `resize-y`. `rows={4}` stays and no `min-h-*` is added: §4.6 adds `min-h-16` only to `rows={2}` boxes, and four rows already fill the 96px `min-h-24` of `Textarea`.
- **§4.12, K16:** the active checkbox takes `checkboxVariants()`. Its `<label>` row is not one of the 9 small targets of K16, so the row keeps its classes.
- **O16:** the header back link (`:97-103`) belongs to 2B and stays as it is, `ArrowLeft className="h-4 w-4"` included.
- **Ruling (spec gap), the test file:** branch and brand have no UI test file of their own, and §9.6 lists no new test file for batch 2 (supplier keeps `tests/supplier-form-ui.test.ts`, edited per §10.4 table A). Each batch-2 form gets its own `tests/<form>-form-ui.test.ts`, named like the supplier form's existing `tests/supplier-form-ui.test.ts` (Tasks 2–7 create theirs; Task 8 edits the supplier file). This task creates `tests/branch-form-ui.test.ts` with one test. The guards pin the old patterns; this test pins what they cannot see: the save gate `disabled={companies.length === 0}`, that Save uses `busy` at all, the cancel link, and the three `required` controls.
- **Ruling, the scripts:** `p2c-budget.mjs` is plan 1's script (plan 1 Task 9 Step 2) without changes. `p2c-precheck.mjs` is new: it takes the file as an argument and carries the seeds of all 8 batch-2 files. Task 2 runs it as it is; Tasks 3–8 save their own precheck, which also checks the text they quote. The controller can still run this one for any of the 8 files (Task 0 Step 1).

What users will see:
- The branch form gets the 2A field look: white fields 44px tall with 16px text on phones and 40px on desktop, 13px labels, and an orange star that screen readers do not read (they hear "required" from `aria-required`).
- The address box can be resized up and down.
- Cancel and Save are 44px tall on phones and stay 40px on desktop.
- While saving, Save keeps focus and shows a spinner in place of its icon, and another click does nothing. With no company to choose, Save is grey (the 2A disabled look) instead of faded blue.
- The active checkbox stays 16px and gets the shared focus outline.

Not in this task:
- the header back link (O16, 2B)
- the form panel `rounded-lg border border-border bg-surface p-6` (K28, 2D)
- the F1 row `mt-6 flex justify-end gap-3 border-t border-border pt-5`, which keeps its classes (§6.7, §6.15 ruling 11)
- messages: no key changes (no `messages-edit.mjs` run)
- No toast, `required`, `maxLength` or `disabled` gate changes (K4). Do not run a formatter.

**Files:**
- Modify: `src/components/master-data/branch-form.tsx` (CRLF, 4 replacements)
- Create: `tests/branch-form-ui.test.ts` (LF, like the test files plan 1 created)
- Modify: `tests/form-migration-guards.test.ts` (LF, through the budget script only)
- Temp folder only, never committed: `p2c-precheck.mjs`, `p2c-budget.mjs` (Task 2 reuses both; Tasks 3–8 reuse `p2c-budget.mjs`)

**Must keep passing without edits:**
- `tests/master-data-return-navigation.test.ts:69-71`: `backHref: providedBackHref`, `` const backHref = providedBackHref ?? `/${locale}/master-data/branches` `` and `router.push(backHref)` stay in this file.
- `tests/mobile-field-navigation.test.ts:70-71`: the branch new and edit routes stay focus routes (plan 1 K15), so the bottom navigation does not cover the form on phones.

**Interfaces:**
- Consumes:
  - 2A: `Input` (`@/components/ui/input`), `NativeSelect` (`…/native-select`), `Textarea` (`…/textarea`), `Field` (`label`, `required`; the child is one element) from `@/components/ui/field`, `checkboxVariants` from `@/components/ui/field-variants`, and `Button` with `busy` (its default `type` is `"button"`) plus `buttonVariants`, both from `@/components/ui/button`.
  - Plan 1: the Task 7 guard file with the 26 plan-1 files in `MIGRATED_FILES` and the batch-2 seeds of spec §9.4 still in place.
- Produces (Tasks 2–8 rely on these):
  - `master-data/branch-form.tsx` in `MIGRATED_FILES` (the line after `admin/depreciation-policy-builder.tsx`), with no entry left in `LOCAL_FIELD`, `RAW_FIELDS`, `FIELD_CLASS_STRINGS`, `OLD_MARKUP` or `LOADER2`. `CONSTRAINT_FLOORS` stays `[3, 4, 0]`.
  - `tests/branch-form-ui.test.ts`: LF, 1 test. Tasks 2–7 create `tests/<form>-form-ui.test.ts` the same way: the three imports, then `const source = readFileSync(<form>, "utf8").replace(/\r\n/g, "\n")`.
  - `p2c-precheck.mjs` and `p2c-budget.mjs` in the temp folder.

| file | `LOCAL_FIELD` | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `OLD_MARKUP` | `LOADER2` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|---|---|
| `master-data/branch-form.tsx` | 1 → – | 5 → – | 5 → – | 3 → – | 1 → – | 3/4/0 unchanged |

`OLD_MARKUP` 3 = the local `Field`'s label span, its red star, and the checkbox `h-4 w-4 rounded border-border`.

- [ ] **Step 1: Check what this task builds on**

Save this script as `p2c-precheck.mjs` in your temp folder (never in the repo):

```js
// p2c-precheck.mjs: run from the repo root before each batch-2 migration. Usage: node p2c-precheck.mjs <path under src/components/>
// Confirms that plan 1 is merged, that the primitives batch 2 uses are there, and that the guard still holds the
// file's 5ffee76 seeds (spec §9.4). Reads only; writes nothing. Never commit this file.
import { existsSync, readFileSync } from "node:fs"

const C = "src/components/"
const GUARD = "tests/form-migration-guards.test.ts"
const file = process.argv[2]
// Seeds of the 8 batch-2 files in tests/form-migration-guards.test.ts at 4daf0b9 (= spec §9.4). floors = CONSTRAINT_FLOORS.
const SEEDS = {
  "master-data/branch-form.tsx": { LOCAL_FIELD: 1, RAW_FIELDS: 5, FIELD_CLASS_STRINGS: 5, OLD_MARKUP: 3, LOADER2: 1, floors: [3, 4, 0] },
  "master-data/brand-form.tsx": { LOCAL_FIELD: 0, RAW_FIELDS: 1, FIELD_CLASS_STRINGS: 1, OLD_MARKUP: 3, LOADER2: 1, floors: [1, 1, 0] },
  "master-data/category-form.tsx": { LOCAL_FIELD: 1, RAW_FIELDS: 9, FIELD_CLASS_STRINGS: 9, OLD_MARKUP: 4, LOADER2: 1, floors: [4, 7, 0] },
  "master-data/company-form.tsx": { LOCAL_FIELD: 1, RAW_FIELDS: 6, FIELD_CLASS_STRINGS: 6, OLD_MARKUP: 3, LOADER2: 1, floors: [2, 6, 0] },
  "master-data/department-form.tsx": { LOCAL_FIELD: 1, RAW_FIELDS: 3, FIELD_CLASS_STRINGS: 3, OLD_MARKUP: 3, LOADER2: 1, floors: [2, 2, 0] },
  "master-data/employee-form.tsx": { LOCAL_FIELD: 1, RAW_FIELDS: 10, FIELD_CLASS_STRINGS: 10, OLD_MARKUP: 3, LOADER2: 1, floors: [6, 5, 0] },
  "master-data/location-form.tsx": { LOCAL_FIELD: 1, RAW_FIELDS: 6, FIELD_CLASS_STRINGS: 6, OLD_MARKUP: 3, LOADER2: 1, floors: [4, 3, 0] },
  "master-data/supplier-form.tsx": { LOCAL_FIELD: 1, RAW_FIELDS: 6, FIELD_CLASS_STRINGS: 1, OLD_MARKUP: 3, LOADER2: 1, floors: [2, 6, 0] },
}
// Budgets that hold no batch-2 file at 5ffee76; the file must not appear in them.
const EMPTY_FOR_BATCH_2 = ["OLD_HELPERS", "REVERSE", "CLOSE_LABEL_IS_CANCEL", "FIXED_BOTTOM_BARS"]

if (!SEEDS[file]) {
  console.error(`usage: node p2c-precheck.mjs <one of: ${Object.keys(SEEDS).join(", ")}>`)
  process.exit(2)
}
const raw = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "")
const read = (path) => raw(path).replace(/\r\n/g, "\n")
const ui = (name) => read(`${C}ui/${name}`)
const guard = read(GUARD)
const lines = guard.split("\n")
const quoted = file.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")
const key = String.raw`\[` + "`" + String.raw`\$\{C\}` + quoted + "`" + String.raw`\]`

// The lines of `const NAME ...` up to the line that closes it at column 0.
function block(name) {
  const start = lines.findIndex((line) => new RegExp(String.raw`^const ${name}\b`).test(line))
  if (start === -1) return null
  const end = lines.findIndex((line, index) => index > start && /^[}\]]/.test(line))
  return lines.slice(start, end + 1).join("\n")
}
const budget = (name) => Number(new RegExp(key + String.raw`\s*:\s*(\d+)`).exec(block(name) ?? "")?.[1] ?? 0)
const floors = () => new RegExp(key + String.raw`\s*:\s*\[(\d+), (\d+), (\d+)\]`).exec(block("CONSTRAINT_FLOORS") ?? "")?.slice(1).map(Number) ?? null
const listed = (name) => (block(name) ?? "").includes("`${C}" + file + "`")
const plan1Files = [...guard.matchAll(/^\s+"(?:1a|1b|1c|1d|1g|1e|1f)": \[([^\]]*)\]/gm)].flatMap((match) => [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]))
const seed = SEEDS[file]
const source = raw(C + file)

const checks = {
  "2A Field with hideLabel, hint, error and id; FieldRequiredMark": /export \{[^}]*\bField\b[^}]*\bFieldRequiredMark\b[^}]*\}/.test(ui("field.tsx")) && ["hideLabel", "hint", "error", "id"].every((prop) => new RegExp(String.raw`\b${prop}\?: `).test(ui("field.tsx"))),
  "2A Input, NativeSelect, Textarea": /export \{ Input \}/.test(ui("input.tsx")) && /export \{ NativeSelect \}/.test(ui("native-select.tsx")) && /export \{ Textarea \}/.test(ui("textarea.tsx")),
  "2A checkboxVariants and P0.2 fieldLabelClasses": /export const checkboxVariants = cva\(/.test(ui("field-variants.ts")) && /export const fieldLabelClasses = "text-meta font-medium text-foreground"/.test(ui("field-variants.ts")),
  "2A Button with busy, and buttonVariants": /\bbusy\?: boolean\b/.test(ui("button.tsx")) && /export \{ Button, buttonVariants \}/.test(ui("button.tsx")),
  "plan 1 merged: its 26 files are in MIGRATED_FILES": plan1Files.length === 26 && plan1Files.every((path) => (block("MIGRATED_FILES") ?? "").includes("`${C}" + path + "`")),
  [`${file} is not in MIGRATED_FILES yet`]: !listed("MIGRATED_FILES"),
  [`${file} budgets at their seeds`]: ["LOCAL_FIELD", "RAW_FIELDS", "FIELD_CLASS_STRINGS", "OLD_MARKUP", "LOADER2"].every((name) => budget(name) === seed[name]),
  [`${file} CONSTRAINT_FLOORS ${seed.floors.join("/")}`]: floors()?.join("/") === seed.floors.join("/"),
  [`${file} is in no other budget and not in PENDING_FOOTER_PARTS`]: EMPTY_FOR_BATCH_2.every((name) => budget(name) === 0) && !listed("PENDING_FOOTER_PARTS"),
  [`${C}${file} exists`]: source.length > 0,
}
let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
const crlf = (source.match(/\r\n/g) ?? []).length
const lf = (source.match(/\n/g) ?? []).length
console.log(`info    line endings: ${crlf === lf && lf > 0 ? "CRLF" : crlf === 0 ? "LF" : "mixed"}`)
const formTest = `tests/${file.replace(/^master-data\//, "").replace(/\.tsx$/, "-ui.test.ts")}`
console.log(`info    ${formTest}: ${existsSync(formTest) ? "already there" : "not there yet"}`)
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start this task; report which.`)
  process.exit(1)
}
console.log(`preconditions hold for ${file}`)
```

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2c-plan2`

Run: `git status --short src tests messages` then `node <temp>/p2c-precheck.mjs master-data/branch-form.tsx`
Expected: `git status` prints nothing. The script prints:
```
ok      2A Field with hideLabel, hint, error and id; FieldRequiredMark
ok      2A Input, NativeSelect, Textarea
ok      2A checkboxVariants and P0.2 fieldLabelClasses
ok      2A Button with busy, and buttonVariants
ok      plan 1 merged: its 26 files are in MIGRATED_FILES
ok      master-data/branch-form.tsx is not in MIGRATED_FILES yet
ok      master-data/branch-form.tsx budgets at their seeds
ok      master-data/branch-form.tsx CONSTRAINT_FLOORS 3/4/0
ok      master-data/branch-form.tsx is in no other budget and not in PENDING_FOOTER_PARTS
ok      src/components/master-data/branch-form.tsx exists
info    line endings: CRLF
info    tests/branch-form-ui.test.ts: not there yet
preconditions hold for master-data/branch-form.tsx
```
On any `MISSING` line, stop and report it.

Run: `git ls-files --eol src/components/master-data/branch-form.tsx tests/form-migration-guards.test.ts`
Expected: `i/lf w/crlf` for the form and `i/lf w/lf` for the guard file. Keep both as they are.

- [ ] **Step 2: Save the budget script**

Every migration commit lowers its own file's budgets and adds the file to `MIGRATED_FILES` (spec §9.9). Two budget objects can hold the same line text for one file (`RAW_FIELDS` and `FIELD_CLASS_STRINGS` both hold `5` for this form), so exact-string edits cannot target them. This script edits by object name instead. It checks each current value against the number you pass and writes nothing on a mismatch. It is plan 1's script without changes. Save it as `p2c-budget.mjs` in your temp folder (never in the repo):

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

`NAME=from:to` lowers the entry from `from` to `to`, and `to = 0` deletes the line. `NAME=1:1` keeps an entry that a task must leave in place. Any budget that still holds a number for the file must be named, so no row is forgotten. Use `:` and not `>`, because the shell reads `>` as a redirect. No batch-2 file is in `PENDING_FOOTER_PARTS`, so no batch-2 task passes `--footer-done`.

- [ ] **Step 3: Lower the branch form's budgets (the failing guard)**

Run: `node <temp>/p2c-budget.mjs master-data/branch-form.tsx LOCAL_FIELD=1:0 RAW_FIELDS=5:0 FIELD_CLASS_STRINGS=5:0 OLD_MARKUP=3:0 LOADER2=1:0`
Expected:
```
LOCAL_FIELD: 1 -> 0
RAW_FIELDS: 5 -> 0
FIELD_CLASS_STRINGS: 5 -> 0
OLD_MARKUP: 3 -> 0
LOADER2: 1 -> 0
MIGRATED_FILES: added master-data/branch-form.tsx
```
On `ABORT`, stop and report the lines it prints.

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 18 · fail 5`. Each failing guard names only `src/components/master-data/branch-form.tsx`:
- GF1 `1 > 0`
- GF2 `5 > 0`
- GF3 `5 > 0`
- GF7 `3 > 0`
- GB1 `1 > 0`

GF4 and GF8 already pass: each starred local `Field` has a control with native `required`, and no `<label>` wraps a `Field`.

- [ ] **Step 4: Create the failing test `tests/branch-form-ui.test.ts`**

Create the file with this content, LF line endings:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Phase 2C batch 2 (spec 2C §8.9): the branch form on the shared fields and buttons. The form is CRLF in the
// working tree, so the source is read with \r stripped before the multi-line regexes.
const source = readFileSync("src/components/master-data/branch-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the branch form uses the shared fields and a busy save button that still waits for a company (2C batch 2)", () => {
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /function Field\(|<select|<textarea|<button|Loader2|ml-1 text-danger|resize-none/)
  assert.equal(source.match(/<input\b/g)?.length, 1, "only the active checkbox stays a native input")
  assert.equal(source.match(/<Field label=\{t\("(?:code|name|company)"\)\} required>/g)?.length, 3)
  assert.equal(source.match(/^\s+required$/gm)?.length, 3, "code, name and company keep the browser's own required check")
  assert.match(source, /<Textarea\n\s+value=\{values\.address \?\? ""\}\n[^\n]*\n\s+rows=\{4\}\n\s+maxLength=\{500\}\n\s+\/>/)
  assert.match(source, /className=\{checkboxVariants\(\)\}/)
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>\n\s+\{tCommon\("cancel"\)\}/)
  assert.match(source, /<Button type="submit" busy=\{saving\} disabled=\{companies\.length === 0\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}/)
})
```

Run: `node --test tests/branch-form-ui.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`. The test fails first on `/import \{ Field \} from "@\/components\/ui\/field"/`.

- [ ] **Step 5: Move the branch form onto the primitives (`src/components/master-data/branch-form.tsx`)**

Four exact replacements. Make all four before you compile: (1) imports the 2A `Field` and (4) deletes the local one, and the file type-checks only with both, because the names clash (§4.3 F8).

(1) Imports. `Loader2` goes away; the six primitives come in, sorted by path like the asset model form.

Replace:

```tsx
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useApiError } from "@/components/ui/use-api-error"
```

with:

```tsx
import { ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
```

(2) The five fields and the active checkbox.

Replace:

```tsx
          <Field label={t("code")} required>
            <input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>

          <Field label={t("name")} required>
            <input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>

          <Field label={t("company")} required>
            <select
              value={values.companyId}
              onChange={(event) => setField("companyId", event.target.value)}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              <option value="">{t("selectCompany")}</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.code} - {company.nameTh}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("contactPerson")}>
            <input
              value={values.contactPerson ?? ""}
              onChange={(event) => setField("contactPerson", event.target.value)}
              maxLength={200}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>

          <div className="md:col-span-2">
            <Field label={t("address")}>
              <textarea
                value={values.address ?? ""}
                onChange={(event) => setField("address", event.target.value)}
                rows={4}
                maxLength={500}
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </Field>
          </div>

          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
            />
```

with:

```tsx
          <Field label={t("code")} required>
            <Input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
            />
          </Field>

          <Field label={t("name")} required>
            <Input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
            />
          </Field>

          <Field label={t("company")} required>
            <NativeSelect
              value={values.companyId}
              onChange={(event) => setField("companyId", event.target.value)}
              required
            >
              <option value="">{t("selectCompany")}</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.code} - {company.nameTh}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label={t("contactPerson")}>
            <Input
              value={values.contactPerson ?? ""}
              onChange={(event) => setField("contactPerson", event.target.value)}
              maxLength={200}
            />
          </Field>

          <div className="md:col-span-2">
            <Field label={t("address")}>
              <Textarea
                value={values.address ?? ""}
                onChange={(event) => setField("address", event.target.value)}
                rows={4}
                maxLength={500}
              />
            </Field>
          </div>

          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
              className={checkboxVariants()}
            />
```

(3) Cancel link (#127) and save button (#128). The F1 row around them keeps its classes (§6.7).

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
            disabled={saving || companies.length === 0}
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
          <Button type="submit" busy={saving} disabled={companies.length === 0}>
            <Save aria-hidden="true" />
            {tCommon("save")}
          </Button>
```

(4) The local `Field` goes. The file ends with `}` and one line break, as before.

Replace:

```tsx
      </form>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
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
      </form>
    </div>
  )
}
```

Check: `grep -n "Loader2\|<input\|<select\|<textarea\|<button\|function Field\|resize-none" src/components/master-data/branch-form.tsx` prints one line, `167:            <input` (the active checkbox; `type="checkbox"` is not a raw field).

- [ ] **Step 6: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/branch-form-ui.test.ts tests/master-data-return-navigation.test.ts tests/master-data-brand-supplier-ui.test.ts tests/visual-foundation-guards.test.ts tests/ui-overlay-guards.test.ts tests/mobile-field-navigation.test.ts`
Expected: PASS, `tests 79 · pass 79 · fail 0`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 1 more test than before Step 4 (from `4daf0b9`: 1803 tests, 1802 pass, 1 skipped).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows exactly 2 files: `branch-form.tsx` with 18 insertions and 44 deletions, and `tests/form-migration-guards.test.ts` with 1 insertion and 5 deletions.
- `git status` also lists `?? tests/branch-form-ui.test.ts` (19 lines).
- Git may warn that LF will be replaced by CRLF in the two LF test files. Leave them LF.
- A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 8: Commit**

```bash
git add src/components/master-data/branch-form.tsx tests/branch-form-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): branch form on the shared fields and a busy save button (2C batch 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 2 dev-app check:**
- `/th/master-data/branches/new` at 375 and 1440: fields 44px with 16px text on the phone, 40px on desktop; orange stars on code, name and company; Cancel and Save side by side in the F1 row at 375.
- Leave code empty and press Save: the browser still stops the submit on the empty field (native `required`).
- Save a branch with the code `"   "` (three spaces): the toast reads the Thai validation message, not JSON (plan 1 Task 8, spec §10.5).
- With no company in the database, Save is grey and cannot be pressed (`disabled={companies.length === 0}`).
- NVDA reads code, name and company as "required" and does not read a star.

---

### Task 2: Batch 2 · `master-data/brand-form.tsx`

Spec §8.9 "ชุด 2" row `brand-form.tsx`, with §4.3 (F1, F2, F4, F5), §4.6, §4.12 (checkbox `brand-form.tsx:103`), §4.14 (the row), §6.3 #129–#130, §6.7, §9.4 and §10.3 "plan 2". One file, one commit (I30). The form is CRLF; edit it with exact-string replacement only.

Rulings this task applies:
- **§4.3 F4, F5:** the hand-written `<label className="block">` with its label span and red star becomes `<Field label={t("brandName")} required>`. `block` was its only class, so `Field` takes no `className`. The form never had a local `Field` (no `LOCAL_FIELD` entry).
- **K4, GF5:** `required` and `maxLength={200}` stay on the `Input` (floor `1/1/0`).
- **K13, §6.3 #130:** Save is `busy={saving}` and loses `disabled`, which was exactly `saving`.
- **§4.12, K16:** the active checkbox takes `checkboxVariants()`. Its `<label>` row is not one of the 9 small targets of K16, so it keeps its classes, `md:self-end` included.
- **O16:** the header back link (`:77-83`) belongs to 2B and stays as it is.
- **The test file (Task 1's ruling):** the brand test gets its own `tests/brand-form-ui.test.ts`. `tests/master-data-brand-supplier-ui.test.ts` checks the brand pages and the asset model form, not this form, and needs no change.

What users will see:
- The brand name field gets the 2A field look: white, 44px tall with 16px text on phones and 40px on desktop, a 13px label, and an orange star that screen readers do not read (they hear "required").
- Cancel and Save are 44px tall on phones and stay 40px on desktop.
- While saving, Save keeps focus and shows a spinner in place of its icon, and another click does nothing.
- The active checkbox stays 16px and gets the shared focus outline.

Not in this task:
- the header back link (O16, 2B)
- the form panel (K28, 2D)
- the F1 row `mt-6 flex justify-end gap-3 border-t border-border pt-5`, which keeps its classes (§6.7)
- messages: no key changes (no `messages-edit.mjs` run)
- No toast, `required`, `maxLength` or `disabled` gate changes (K4). Do not run a formatter.

**Files:**
- Modify: `src/components/master-data/brand-form.tsx` (CRLF, 3 replacements)
- Create: `tests/brand-form-ui.test.ts` (LF, 1 test)
- Modify: `tests/form-migration-guards.test.ts` (LF, through the budget script only)
- Temp folder only, never committed: `p2c-precheck.mjs`, `p2c-budget.mjs` from Task 1

**Must keep passing without edits:**
- `tests/master-data-return-navigation.test.ts:69-71`: `backHref: providedBackHref`, `` const backHref = providedBackHref ?? `/${locale}/master-data/brands` `` and `router.push(backHref)` stay in this file.
- `tests/mobile-field-navigation.test.ts:72-73`: the brand new and edit routes stay focus routes.

**Interfaces:**
- Consumes:
  - 2A: `Input`, `Field` (`label`, `required`), `checkboxVariants`, `Button` with `busy`, `buttonVariants` (same imports as Task 1, without `NativeSelect` and `Textarea`).
  - Task 1: `master-data/branch-form.tsx` is the last line of `MIGRATED_FILES`; `p2c-precheck.mjs` and `p2c-budget.mjs` are in the temp folder.
- Produces (Tasks 3–8 rely on these): `master-data/brand-form.tsx` in `MIGRATED_FILES` after the branch form, with no entry left in `RAW_FIELDS`, `FIELD_CLASS_STRINGS`, `OLD_MARKUP` or `LOADER2`. `CONSTRAINT_FLOORS` stays `[1, 1, 0]`. `tests/brand-form-ui.test.ts` holds 1 test.

| file | `LOCAL_FIELD` | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `OLD_MARKUP` | `LOADER2` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|---|---|
| `master-data/brand-form.tsx` | – | 1 → – | 1 → – | 3 → – | 1 → – | 1/1/0 unchanged |

`OLD_MARKUP` 3 = the label span `mb-1.5 block text-sm font-medium text-foreground`, the red star, and the checkbox `h-4 w-4 rounded border-border`.

- [ ] **Step 1: Check what this task builds on**

If `<temp>/p2c-precheck.mjs` or `<temp>/p2c-budget.mjs` is missing, save it again from Task 1 Step 1 or Step 2.

Run: `git status --short src tests messages` then `node <temp>/p2c-precheck.mjs master-data/brand-form.tsx`
Expected: `git status` prints nothing. The script prints:
```
ok      2A Field with hideLabel, hint, error and id; FieldRequiredMark
ok      2A Input, NativeSelect, Textarea
ok      2A checkboxVariants and P0.2 fieldLabelClasses
ok      2A Button with busy, and buttonVariants
ok      plan 1 merged: its 26 files are in MIGRATED_FILES
ok      master-data/brand-form.tsx is not in MIGRATED_FILES yet
ok      master-data/brand-form.tsx budgets at their seeds
ok      master-data/brand-form.tsx CONSTRAINT_FLOORS 1/1/0
ok      master-data/brand-form.tsx is in no other budget and not in PENDING_FOOTER_PARTS
ok      src/components/master-data/brand-form.tsx exists
info    line endings: CRLF
info    tests/brand-form-ui.test.ts: not there yet
preconditions hold for master-data/brand-form.tsx
```
On any `MISSING` line, or if the last `info` line does not say `not there yet`, stop and report it.

Run: `git ls-files --eol src/components/master-data/brand-form.tsx tests/form-migration-guards.test.ts`
Expected: `i/lf w/crlf` for the form and `i/lf w/lf` for the guard file. Keep both as they are.

- [ ] **Step 2: Lower the brand form's budgets (the failing guard)**

Run: `node <temp>/p2c-budget.mjs master-data/brand-form.tsx RAW_FIELDS=1:0 FIELD_CLASS_STRINGS=1:0 OLD_MARKUP=3:0 LOADER2=1:0`
Expected:
```
RAW_FIELDS: 1 -> 0
FIELD_CLASS_STRINGS: 1 -> 0
OLD_MARKUP: 3 -> 0
LOADER2: 1 -> 0
MIGRATED_FILES: added master-data/brand-form.tsx
```
On `ABORT`, stop and report the lines it prints.

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 19 · fail 4`. Each failing guard names only `src/components/master-data/brand-form.tsx`:
- GF2 `1 > 0`
- GF3 `1 > 0`
- GF7 `3 > 0`
- GB1 `1 > 0`

GF4 and GF8 already pass: the form has no `Field` yet, and its `<label>` wraps only a span and an `<input>`.

- [ ] **Step 3: Create the failing test `tests/brand-form-ui.test.ts`**

Create the file with this content, LF line endings:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Phase 2C batch 2 (spec 2C §8.9): the brand form on the shared field and buttons. The form is CRLF in the
// working tree, so the source is read with \r stripped before the multi-line regexes.
const source = readFileSync("src/components/master-data/brand-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the brand form uses the shared field and a busy save button (2C batch 2)", () => {
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /<label className="block">|mb-1\.5 block text-sm|ml-1 text-danger|<button|Loader2|disabled=/)
  assert.equal(source.match(/<input\b/g)?.length, 1, "only the active checkbox stays a native input")
  assert.match(source, /<Field label=\{t\("brandName"\)\} required>\n\s+<Input\n\s+value=\{values\.name\}\n[^\n]*\n\s+maxLength=\{200\}\n\s+required\n\s+\/>\n\s+<\/Field>/)
  assert.match(source, /className=\{checkboxVariants\(\)\}/)
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>\n\s+\{tCommon\("cancel"\)\}/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}/)
})
```

Run: `node --test tests/brand-form-ui.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`. The test fails first on `/import \{ Field \} from "@\/components\/ui\/field"/`.

- [ ] **Step 4: Move the brand form onto the primitives (`src/components/master-data/brand-form.tsx`)**

Three exact replacements.

(1) Imports. `Loader2` goes away; the five primitives the form uses come in.

Replace:

```tsx
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useApiError } from "@/components/ui/use-api-error"
```

with:

```tsx
import { ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { useApiError } from "@/components/ui/use-api-error"
```

(2) The brand name and the active checkbox. The hand-written `<label>` with its span and red star becomes the shared `Field` (§4.3 F4, F5); its only class was `block`, so `Field` takes no `className`.

Replace:

```tsx
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              {t("brandName")}
              <span className="ml-1 text-danger">*</span>
            </span>
            <input
              value={values.name}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              maxLength={200}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </label>

          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm md:self-end">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setValues((current) => ({ ...current, isActive: event.target.checked }))}
              className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
            />
```

with:

```tsx
          <Field label={t("brandName")} required>
            <Input
              value={values.name}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              maxLength={200}
              required
            />
          </Field>

          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm md:self-end">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setValues((current) => ({ ...current, isActive: event.target.checked }))}
              className={checkboxVariants()}
            />
```

(3) Cancel link (#129) and save button (#130). The F1 row around them keeps its classes (§6.7).

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

Check: `grep -n "Loader2\|<input\|<select\|<textarea\|<button\|<label\|text-danger" src/components/master-data/brand-form.tsx` prints two lines, the active checkbox row: `101:          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm md:self-end">` and `102:            <input`.

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/brand-form-ui.test.ts tests/master-data-return-navigation.test.ts tests/master-data-brand-supplier-ui.test.ts tests/visual-foundation-guards.test.ts tests/ui-overlay-guards.test.ts tests/mobile-field-navigation.test.ts`
Expected: PASS, `tests 79 · pass 79 · fail 0`.

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 1 more test than after Task 1 (from `4daf0b9`: 1804 tests, 1803 pass, 1 skipped).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: `git diff --stat` shows exactly 2 files: `brand-form.tsx` with 13 insertions and 21 deletions, and `tests/form-migration-guards.test.ts` with 1 insertion and 4 deletions. `git status` also lists `?? tests/brand-form-ui.test.ts` (17 lines). Git may warn that LF will be replaced by CRLF in the two LF test files; leave them LF. A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 7: Commit**

```bash
git add src/components/master-data/brand-form.tsx tests/brand-form-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): brand form on the shared field and a busy save button (2C batch 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 2 dev-app check:**
- `/th/master-data/brands/new` at 375 and 1440: the name field 44px with 16px text on the phone and 40px on desktop, an orange star, and the active checkbox row level with the field's bottom from `md` (`md:self-end`).
- Leave the name empty and press Save: the browser still stops the submit (native `required`).
- Save with a name: Save shows a spinner, keeps focus, and the page returns to the brand list (`router.push(backHref)`).

---

### Task 3: Batch 2 · `master-data/category-form.tsx` (shared fields, template editor buttons, photo checklist row)

Move the category form onto the 2A fields and buttons. Spec §10 (I1–I36) first, then §4 (F1–F8 · 4.4 L1 · 4.6 textarea heights · 4.8 row 21 · 4.12 checkboxes `:150`, `:391` and the 44px row `:390` · 4.14 row), §6.2.2–6.2.6 (variant, size, icons, the photo-row grid), §6.3 rows #131–#142, §6.5.1, §6.7 (cancel link; the F1 row keeps its classes), §8.9 (batch 2 row) and §9.4 (budgets). One file, one commit. The file has not changed since `5ffee76`, so the spec's line numbers are HEAD's.

**Task 1 must run first.** It saves `p2c-budget.mjs` in your temp folder; this task only runs it:
`// Usage: node p2c-budget.mjs <path under src/components/> NAME=from:to ... [--footer-done]   (to = 0 deletes the entry)`

Rulings this task applies:
- **I30 / F8:** one file, one commit. Step 4 imports the shared `Field` in replacement (1) and deletes the local one in replacement (5); make all eight replacements before you compile, because the names clash.
- **§10.1 / K4:** `label=` is the first prop of `Field`. `required` and `maxLength` stay on the control (guard GF5 floor `[4, 7, 0]`: code, name, field name and field label `required`; 7 `maxLength`). No toast, `required`, `maxLength` or `disabled` gate changes.
- **§6.3 #131–#142:** both "add" buttons and the move up, move down and duplicate row buttons are `outline` `md`; remove custom field (#138, red text on the page) is `danger` `md`; the 4 photo-row icon buttons are `outline` `icon`. The move buttons keep `disabled={index === 0}` and `disabled={index === fields.length - 1}` / `disabled={index === items.length - 1}`. The cancel link is `buttonVariants({ variant: "outline" })`; save is `busy={saving}` with no `disabled` (§6.5.1).
- **K22 (#142):** the photo item remove icon is a neutral `outline` icon. It no longer turns red on hover, and no color class goes on top.
- **§6.2.6:** the photo row grid `sm:grid-cols-[minmax(0,1fr)_repeat(4,2.5rem)]` becomes `sm:grid-cols-[minmax(0,1fr)_repeat(4,auto)]`, and the 4 icon buttons get `className="justify-self-start"`, because `size="icon"` is 44px wide below `md`.
- **K20 (§4.8 row 21):** the photo item field gets `<Field label={labels.item} hideLabel>` and keeps its placeholder.
- **K16 (§4.12):** both checkboxes use `checkboxVariants()`. The "required" row `:390` is one of the 9 small targets and gets `min-h-11`; the "active" row `:149` is a ~40px box (group B2) and keeps its classes.
- **§4.6:** the description `Textarea` keeps `min-h-28`; the options `Textarea` drops `min-h-24`, which `Textarea` already has.
- **Icons:** the size classes go (`Button` sets 16px) and each icon gets `aria-hidden="true"`, as in plan 1 Task 14 (`asset-model-form`).
- **Ruling (spec gap), the test file:** this form has no UI test file (§8.9 lists `master-data-return-navigation`, `supplier-form-ui` and `ui-overlay-guards` for batch 2, and §10.4 table B adds none). The guard file sees fields, stars, spinners and the local `Field`, but not `busy`, the button variants, K22, the grid or the 44px row. This task adds `tests/category-form-ui.test.ts` with two tests that pin those.

What users will see (`/th/master-data/categories/new` and `…/<id>/edit`):
- Code, name, description and every template editor field get the 2A field look: 44px with 16px text on phones and 40px on desktop, white fill, 13px labels, and an orange star that screen readers skip (they hear "required" from `aria-required`).
- The description box keeps its 112px minimum and can still be resized vertically.
- "Add custom field", "Add photo item" and the move up, move down and duplicate row buttons: grey outline, 36px on desktop and 44px on phones. "Remove custom field" is a red outline button. A move button that cannot move is grey instead of faded.
- The "required field" checkbox row is a 44px tap target.
- Photo checklist rows:
  - Screen readers name each item field ("รายการรูปที่ต้องการ").
  - The 4 icon buttons are 40px on desktop and 44px on phones. Between 640 and 767px the icon columns grow to fit the 44px buttons instead of overflowing 40px columns. On phones each button stays left-aligned on its own row, as today.
  - The remove icon is grey with a grey hover (K22).
- Save: a spinner replaces the save icon, the label stays "บันทึก", and the button keeps focus and ignores clicks while it saves. Cancel is an outline link button.

Not in this task:
- the header back link `:107` (O16, 2B)
- the three section panels, their headings and their `mt-1 text-sm` description lines (K28 and 2D; F6's hint regex does not match them)
- the dashed empty boxes `:318`, `:499` (2D)
- the F1 footer row `flex justify-end gap-3 border-t border-border pt-5`, which keeps its classes (§6.7, §6.15 ruling 11)
- messages: every label already has a key, so `messages/*.json` stay as they are

**Files:**
- Modify: `src/components/master-data/category-form.tsx` (CRLF, 8 replacements)
- Create: `tests/category-form-ui.test.ts` (new file, LF like the other 2C test files, 2 tests)
- Modify: `tests/form-migration-guards.test.ts` (LF, only through `p2c-budget.mjs`)
- Temp folder only, never committed: `p2c2-precheck-3.mjs`, `p2c2-css-check-3.mjs`, and Task 1's `p2c-budget.mjs`
- Do not run a formatter.

**Must keep passing without edits:**
- `tests/master-data-return-navigation.test.ts:69-71`: `backHref: providedBackHref`, ``const backHref = providedBackHref ?? `/${locale}/master-data/categories` `` and `router.push(backHref)` stay in this file.
- `tests/category-form-arrays.test.ts`: it tests `src/lib/category-form-arrays.ts`; the form keeps importing `duplicateCategoryCustomField` and `moveArrayItem` from it.
- `tests/mobile-field-navigation.test.ts:76-77`: the category new and edit routes stay focus routes.

**Interfaces:**
- Consumes:
  - 2A: `Input` (`@/components/ui/input`), `NativeSelect` (`…/native-select`), `Textarea` (`…/textarea`), `Button` with `busy` (default `type="button"`) and `buttonVariants`, both from `@/components/ui/button`, and `checkboxVariants` from `@/components/ui/field-variants`.
  - `Field` from `@/components/ui/field` (`label`, `required`, `hint`, `hideLabel`, `className`; one element child that takes `id` and `aria-*`).
  - Plan 1 Task 7: the guard constants in `tests/form-migration-guards.test.ts`. Plan 2 Task 1: `p2c-budget.mjs`.
- Produces (Task 4 starts from here):
  - `master-data/category-form.tsx` is in `MIGRATED_FILES`, and its `LOCAL_FIELD`, `RAW_FIELDS`, `FIELD_CLASS_STRINGS`, `OLD_MARKUP` and `LOADER2` entries are gone. `CONSTRAINT_FLOORS` stays `[4, 7, 0]`.
  - `tests/category-form-ui.test.ts` with 2 tests.

| file | `LOCAL_FIELD` | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `OLD_MARKUP` | `LOADER2` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|---|---|
| `master-data/category-form.tsx` | 1 → – | 9 → – | 9 → – | 4 → – | 1 → – | `[4, 7, 0]` unchanged |

- [ ] **Step 1: Check what this task builds on**

Save this script as `p2c2-precheck-3.mjs` in your temp folder, next to `p2c-budget.mjs` (never in the repo):

```js
// Plan 2 Task 3 precheck: run from the repo root. Confirms the primitives, the budget script of Task 1 and the guard
// entries that the category form migration starts from. Writes nothing. Never commit this file.
import { existsSync, readFileSync } from "node:fs"

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const FILE = "master-data/category-form.tsx"
const form = read(`src/components/${FILE}`)
const guard = read("tests/form-migration-guards.test.ts")
const block = (name) => new RegExp(String.raw`^const ${name}\b[\s\S]*?^[}\]]`, "m").exec(guard)?.[0] ?? ""
const entry = (name) => {
  const match = new RegExp(String.raw`\[\`\$\{C\}${FILE.replace(/[./]/g, "\\$&")}\`\]: (\d+|\[[^\]]*\])`).exec(block(name))
  return match ? match[1] : "none"
}
const listed = (name) => block(name).includes("`${C}" + FILE + "`")
const expected = { LOCAL_FIELD: "1", RAW_FIELDS: "9", FIELD_CLASS_STRINGS: "9", OLD_MARKUP: "4", LOADER2: "1", CONSTRAINT_FLOORS: "[4, 7, 0]", OLD_HELPERS: "none", REVERSE: "none", CLOSE_LABEL_IS_CANCEL: "none", FIXED_BOTTOM_BARS: "none" }
const checks = {
  "Task 1: p2c-budget.mjs is in this temp folder": existsSync(new URL("./p2c-budget.mjs", import.meta.url)),
  "2A/P0: Field takes hideLabel and hint": /hideLabel\?: boolean/.test(read("src/components/ui/field.tsx")) && /hint\?: React\.ReactNode/.test(read("src/components/ui/field.tsx")),
  "2A: checkboxVariants": /export const checkboxVariants = cva\(/.test(read("src/components/ui/field-variants.ts")),
  "2A: Button with busy, and buttonVariants from button.tsx": /busy\?: boolean/.test(read("src/components/ui/button.tsx")) && /export \{ Button, buttonVariants \}/.test(read("src/components/ui/button.tsx")),
  "2A: outline and danger variants, md and icon sizes": ["outline:", "danger:", "md: sizeMd", "icon: sizeIcon"].every((text) => read("src/components/ui/button-variants.ts").includes(text)),
  "2A: Input, NativeSelect, Textarea": /export \{ Input \}/.test(read("src/components/ui/input.tsx")) && /export \{ NativeSelect \}/.test(read("src/components/ui/native-select.tsx")) && /export \{ Textarea \}/.test(read("src/components/ui/textarea.tsx")),
  "the form is still the 5ffee76 text": /^function Field\(\{$/m.test(form) && form.includes("sm:grid-cols-[minmax(0,1fr)_repeat(4,2.5rem)]") && form.includes("{saving ? <Loader2"),
  "tests/category-form-ui.test.ts does not exist yet": !existsSync("tests/category-form-ui.test.ts"),
  "the form is not in MIGRATED_FILES yet": !listed("MIGRATED_FILES"),
  "the form has no footer parts to wait for": !listed("PENDING_FOOTER_PARTS"),
}
for (const [name, value] of Object.entries(expected)) checks[`guard ${name} = ${value}`] = entry(name) === value
let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
const done = ["branch", "brand", "category", "company", "department", "employee", "location", "supplier"].filter((name) => block("MIGRATED_FILES").includes(`master-data/${name}-form.tsx`))
console.log(`info    batch 2 forms already in MIGRATED_FILES: ${done.join(", ") || "none"}`)
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task 3; report which.`)
  process.exit(1)
}
console.log("Task 3 preconditions hold")
```

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/master-data/category-form.tsx tests/form-migration-guards.test.ts`, then `node <temp>/p2c2-precheck-3.mjs`
Expected:
- `git status` prints nothing.
- `git ls-files --eol` prints `i/lf    w/crlf` for the form and `i/lf    w/lf` for the guard file. Keep them so: edit with exact-string replacement only.
- The script prints 20 `ok` lines, one `info` line that names the batch 2 forms already migrated (any answer is fine), and `Task 3 preconditions hold`. On any `MISSING` line, stop and report it.

- [ ] **Step 2: Lower the category form's budgets (the failing guard)**

Run: `node <temp>/p2c-budget.mjs master-data/category-form.tsx LOCAL_FIELD=1:0 RAW_FIELDS=9:0 FIELD_CLASS_STRINGS=9:0 OLD_MARKUP=4:0 LOADER2=1:0`
Expected:
```
LOCAL_FIELD: 1 -> 0
RAW_FIELDS: 9 -> 0
FIELD_CLASS_STRINGS: 9 -> 0
OLD_MARKUP: 4 -> 0
LOADER2: 1 -> 0
MIGRATED_FILES: added master-data/category-form.tsx
```
On `ABORT`, stop and report the lines it prints.

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL. Five guards fail, each naming only `src/components/master-data/category-form.tsx`:
- GF1 `1 > 0`
- GF2 `9 > 0`
- GF3 `9 > 0`
- GF7 `4 > 0` (1 old label span, 1 red star, 2 old checkboxes)
- GB1 `1 > 0`

GF4 and GF8 now read the file and pass: each starred field already has native `required`, and no `<label>` wraps a `Field`.

- [ ] **Step 3: Create the failing test file `tests/category-form-ui.test.ts`**

New file, LF line endings:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/components/master-data/category-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the category form uses the shared fields, buttons and a busy save button (2C batch 2)", () => {
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /function Field\(|<select|<textarea|<button|Loader2|ml-1 text-danger|rounded border-border|disabled:opacity/)
  assert.equal(source.match(/<input\b/g)?.length, 2, "only the two checkboxes stay raw inputs")
  assert.equal(source.match(/<input\n\s+type="checkbox"/g)?.length, 2)
  assert.equal(source.match(/className=\{checkboxVariants\(\)\}/g)?.length, 2)
  assert.equal(source.match(/<Field label=/g)?.length, 9)
  assert.equal(source.match(/^\s+required$/gm)?.length, 4, "code, name, field name and field label keep the browser's own required check")
  assert.match(source, /<Textarea\n\s+value=\{values\.description \?\? ""\}[\s\S]*?maxLength=\{500\}[\s\S]*?className="min-h-28"/)
  assert.match(source, /<label className="inline-flex min-h-11 items-center gap-2 text-sm">/, "the required checkbox row is a 44px target")
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}/)
})

test("the template editors keep their move limits and use the shared button looks (2C batch 2)", () => {
  assert.equal(source.match(/<Button\s+variant="outline"\s+size="md"/g)?.length, 5, "add custom field, add photo item, move up, move down, duplicate")
  assert.match(source, /<Button variant="danger" size="md" onClick=\{\(\) => removeField\(index\)\}>/)
  assert.match(source, /onClick=\{\(\) => moveField\(index, -1\)\} disabled=\{index === 0\}>/)
  assert.match(source, /onClick=\{\(\) => moveField\(index, 1\)\} disabled=\{index === fields\.length - 1\}>/)
  assert.match(source, /sm:grid-cols-\[minmax\(0,1fr\)_repeat\(4,auto\)\]/, "the icon columns size to the 44px phone button")
  assert.match(source, /<Field label=\{labels\.item\} hideLabel>\n\s+<Input\n\s+value=\{item\}[\s\S]*?maxLength=\{100\}/)
  assert.equal(source.match(/variant="outline"\n\s+size="icon"/g)?.length, 4, "the photo item remove icon is neutral (K22)")
  assert.equal(source.match(/className="justify-self-start"/g)?.length, 4)
  assert.match(source, /onClick=\{\(\) => moveItem\(index, -1\)\}\n\s+disabled=\{index === 0\}/)
  assert.match(source, /onClick=\{\(\) => moveItem\(index, 1\)\}\n\s+disabled=\{index === items\.length - 1\}/)
})
```

Run: `node --test tests/category-form-ui.test.ts`
Expected: FAIL, `tests 2 · pass 0 · fail 2`. The first test fails on `/import \{ Field \} from "@\/components\/ui\/field"/`, the second on the message `add custom field, add photo item, move up, move down, duplicate` (0 shared outline buttons today).

- [ ] **Step 4: Move the category form onto the primitives (`src/components/master-data/category-form.tsx`)**

Eight exact replacements, top to bottom.

(1) Imports. `Loader2` goes; the 2A primitives come in. `ArrowLeft` stays for the header back link.

Replace:

```tsx
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Loader2, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import {
  duplicateCategoryCustomField,
  moveArrayItem,
  type CategoryCustomFieldDraft,
} from "@/lib/category-form-arrays"
import { useApiError } from "@/components/ui/use-api-error"
```

with:

```tsx
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import {
  duplicateCategoryCustomField,
  moveArrayItem,
  type CategoryCustomFieldDraft,
} from "@/lib/category-form-arrays"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
```

(2) Code, name, description and the active checkbox. Each control keeps `required` and `maxLength`; the description keeps `rows={4}` and its `min-h-28`; the active row keeps its classes (B2).

Replace:

```tsx
          <Field label={t("code")} required>
            <input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>

          <Field label={t("name")} required>
            <input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>

          <Field label={t("description")}>
            <textarea
              value={values.description ?? ""}
              onChange={(event) => setField("description", event.target.value)}
              maxLength={500}
              rows={4}
              className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>

          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm md:self-start">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
            />
```

with:

```tsx
          <Field label={t("code")} required>
            <Input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
            />
          </Field>

          <Field label={t("name")} required>
            <Input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
            />
          </Field>

          <Field label={t("description")}>
            <Textarea
              value={values.description ?? ""}
              onChange={(event) => setField("description", event.target.value)}
              maxLength={500}
              rows={4}
              className="min-h-28"
            />
          </Field>

          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm md:self-start">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
              className={checkboxVariants()}
            />
```

(3) "Add custom field" (#131).

Replace:

```tsx
            <button
              type="button"
              onClick={() => setCustomFields([...values.customFieldDefs, createCustomFieldDefinition(values.customFieldDefs.length)])}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
              {t("addCustomField")}
            </button>
```

with:

```tsx
            <Button
              variant="outline"
              size="md"
              onClick={() => setCustomFields([...values.customFieldDefs, createCustomFieldDefinition(values.customFieldDefs.length)])}
            >
              <Plus aria-hidden="true" />
              {t("addCustomField")}
            </Button>
```

(4) "Add photo item" (#132).

Replace:

```tsx
            <button
              type="button"
              onClick={() => setPhotoChecklist([...values.photoChecklist, ""])}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
              {t("addPhotoChecklist")}
            </button>
```

with:

```tsx
            <Button variant="outline" size="md" onClick={() => setPhotoChecklist([...values.photoChecklist, ""])}>
              <Plus aria-hidden="true" />
              {t("addPhotoChecklist")}
            </Button>
```

(5) Cancel link (#133), save button (#134) and the local `Field`. The F1 row `<div className="flex justify-end gap-3 border-t border-border pt-5">` above this snippet stays.

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
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
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

function CustomFieldTemplateEditor({
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
        </div>
      </form>
    </div>
  )
}

function CustomFieldTemplateEditor({
```

(6) The template editor fields. `fieldName` and `fieldLabel` keep `required` and their placeholders; the options box drops the `min-h-24` that `Textarea` already has; the `<div className="md:col-span-2">` around it stays (F4).

Replace:

```tsx
            <Field label={labels.fieldName} required>
              <input
                value={field.fieldName}
                onChange={(event) => updateField(index, "fieldName", toFieldName(event.target.value))}
                maxLength={100}
                required
                placeholder="cpu"
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </Field>

            <Field label={labels.fieldLabel} required>
              <input
                value={field.fieldLabel}
                onChange={(event) => updateField(index, "fieldLabel", event.target.value)}
                maxLength={200}
                required
                placeholder="CPU"
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </Field>

            <Field label={labels.fieldLabelTh}>
              <input
                value={field.fieldLabelTh ?? ""}
                onChange={(event) => updateField(index, "fieldLabelTh", event.target.value)}
                maxLength={200}
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </Field>

            <Field label={labels.fieldType}>
              <select
                value={field.fieldType}
                onChange={(event) => updateField(index, "fieldType", event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              >
                <option value="text">{labels.text}</option>
                <option value="number">{labels.number}</option>
                <option value="date">{labels.date}</option>
                <option value="select">{labels.select}</option>
                <option value="boolean">{labels.boolean}</option>
              </select>
            </Field>

            {field.fieldType === "select" && (
              <div className="md:col-span-2">
                <Field label={labels.options}>
                  <textarea
                    value={field.options ?? ""}
                    onChange={(event) => updateField(index, "options", event.target.value)}
                    rows={3}
                    placeholder="Windows 11&#10;Windows 10&#10;macOS"
                    className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  />
                </Field>
              </div>
            )}
```

with:

```tsx
            <Field label={labels.fieldName} required>
              <Input
                value={field.fieldName}
                onChange={(event) => updateField(index, "fieldName", toFieldName(event.target.value))}
                maxLength={100}
                required
                placeholder="cpu"
              />
            </Field>

            <Field label={labels.fieldLabel} required>
              <Input
                value={field.fieldLabel}
                onChange={(event) => updateField(index, "fieldLabel", event.target.value)}
                maxLength={200}
                required
                placeholder="CPU"
              />
            </Field>

            <Field label={labels.fieldLabelTh}>
              <Input
                value={field.fieldLabelTh ?? ""}
                onChange={(event) => updateField(index, "fieldLabelTh", event.target.value)}
                maxLength={200}
              />
            </Field>

            <Field label={labels.fieldType}>
              <NativeSelect
                value={field.fieldType}
                onChange={(event) => updateField(index, "fieldType", event.target.value)}
              >
                <option value="text">{labels.text}</option>
                <option value="number">{labels.number}</option>
                <option value="date">{labels.date}</option>
                <option value="select">{labels.select}</option>
                <option value="boolean">{labels.boolean}</option>
              </NativeSelect>
            </Field>

            {field.fieldType === "select" && (
              <div className="md:col-span-2">
                <Field label={labels.options}>
                  <Textarea
                    value={field.options ?? ""}
                    onChange={(event) => updateField(index, "options", event.target.value)}
                    rows={3}
                    placeholder="Windows 11&#10;Windows 10&#10;macOS"
                  />
                </Field>
              </div>
            )}
```

(7) The "required field" checkbox row (44px target, §4.12) and the row buttons #135–#138. The move buttons keep their `disabled` limits.

Replace:

```tsx
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.isRequired}
                onChange={(event) => updateField(index, "isRequired", event.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
              />
              {labels.required}
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => moveField(index, -1)}
                disabled={index === 0}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowUp className="h-4 w-4" />
                {labels.moveUp}
              </button>
              <button
                type="button"
                onClick={() => moveField(index, 1)}
                disabled={index === fields.length - 1}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowDown className="h-4 w-4" />
                {labels.moveDown}
              </button>
              <button
                type="button"
                onClick={() => duplicateField(index)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                <Copy className="h-4 w-4" />
                {labels.duplicate}
              </button>
              <button
                type="button"
                onClick={() => removeField(index)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-danger transition-colors hover:bg-danger-soft"
              >
                <Trash2 className="h-4 w-4" />
                {labels.remove}
              </button>
            </div>
```

with:

```tsx
            <label className="inline-flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.isRequired}
                onChange={(event) => updateField(index, "isRequired", event.target.checked)}
                className={checkboxVariants()}
              />
              {labels.required}
            </label>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="md" onClick={() => moveField(index, -1)} disabled={index === 0}>
                <ArrowUp aria-hidden="true" />
                {labels.moveUp}
              </Button>
              <Button variant="outline" size="md" onClick={() => moveField(index, 1)} disabled={index === fields.length - 1}>
                <ArrowDown aria-hidden="true" />
                {labels.moveDown}
              </Button>
              <Button variant="outline" size="md" onClick={() => duplicateField(index)}>
                <Copy aria-hidden="true" />
                {labels.duplicate}
              </Button>
              <Button variant="danger" size="md" onClick={() => removeField(index)}>
                <Trash2 aria-hidden="true" />
                {labels.remove}
              </Button>
            </div>
```

(8) The photo checklist row: the icon columns size to the button (§6.2.6), the item gets a hidden label (K20), and the 4 icon buttons #139–#142 are `outline` `icon` with `justify-self-start`. Remove is neutral (K22).

Replace:

```tsx
        <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_repeat(4,2.5rem)]">
          <input
            value={item}
            onChange={(event) => updateItem(index, event.target.value)}
            maxLength={100}
            placeholder={labels.item}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => moveItem(index, -1)}
            disabled={index === 0}
            aria-label={labels.moveUp}
            title={labels.moveUp}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => moveItem(index, 1)}
            disabled={index === items.length - 1}
            aria-label={labels.moveDown}
            title={labels.moveDown}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => duplicateItem(index)}
            aria-label={labels.duplicate}
            title={labels.duplicate}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => removeItem(index)}
            aria-label={labels.remove}
            title={labels.remove}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
```

with:

```tsx
        <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_repeat(4,auto)]">
          <Field label={labels.item} hideLabel>
            <Input
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
              maxLength={100}
              placeholder={labels.item}
            />
          </Field>
          <Button
            variant="outline"
            size="icon"
            onClick={() => moveItem(index, -1)}
            disabled={index === 0}
            aria-label={labels.moveUp}
            title={labels.moveUp}
            className="justify-self-start"
          >
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => moveItem(index, 1)}
            disabled={index === items.length - 1}
            aria-label={labels.moveDown}
            title={labels.moveDown}
            className="justify-self-start"
          >
            <ArrowDown aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => duplicateItem(index)}
            aria-label={labels.duplicate}
            title={labels.duplicate}
            className="justify-self-start"
          >
            <Copy aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => removeItem(index)}
            aria-label={labels.remove}
            title={labels.remove}
            className="justify-self-start"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
```

Check: `grep -n "Loader2\|<input\|<select\|<textarea\|<button\|function Field\|2\.5rem" src/components/master-data/category-form.tsx` prints only the two checkbox lines `154:            <input` and `359:              <input` (`type="checkbox"` is not a raw field).

- [ ] **Step 5: Check that the hand-written classes compile**

Tailwind 4.2.4 emits no CSS for a misspelled class and reports nothing. Save this script as `p2c2-css-check-3.mjs` in your temp folder (never in the repo):

```js
// Plan 2 Task 3 CSS check: run from the repo root. Compiles src/app/globals.css in memory and confirms that every class name
// the category form writes by hand produces CSS (Tailwind 4 emits nothing for a misspelled class). Never commit this file.
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"

const require = createRequire(resolve("package.json"))
const { compile } = require("@tailwindcss/node")
const compiler = await compile(readFileSync("src/app/globals.css", "utf8"), { base: resolve("src/app"), onDependency() {} })
const classes = ["sm:grid-cols-[minmax(0,1fr)_repeat(4,auto)]", "justify-self-start", "min-h-11", "min-h-28", "md:self-start", "md:col-span-2"]
const css = compiler.build(classes)
const escape = (name) => name.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)
const missing = classes.filter((name) => !css.includes(`.${escape(name)}`))
if (missing.length > 0) {
  console.error(`MISSING CSS: ${missing.join(" ")}`)
  process.exit(1)
}
if (!css.includes("grid-template-columns: minmax(0,1fr) repeat(4,auto)")) {
  console.error("the photo row grid compiled to an unexpected value")
  process.exit(1)
}
console.log(`all ${classes.length} classes compile`)
```

Run: `node <temp>/p2c2-css-check-3.mjs`
Expected: `all 6 classes compile` (plus the harmless `MODULE_TYPELESS_PACKAGE_JSON` warning, if Node prints it).

- [ ] **Step 6: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/category-form-ui.test.ts tests/category-form-arrays.test.ts tests/master-data-return-navigation.test.ts tests/visual-foundation-guards.test.ts tests/feedback-states-ui.test.ts tests/choice-controls-ui.test.ts`
Expected: PASS, 0 fail. `tests/category-form-ui.test.ts` reports 2 tests.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 2 more tests than before Step 3.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git status --short src tests messages` and `git diff --stat`
Expected:
- `git status`: ` M src/components/master-data/category-form.tsx`, ` M tests/form-migration-guards.test.ts`, `?? tests/category-form-ui.test.ts`.
- `git diff --stat`: 2 files. `category-form.tsx` about 77 insertions and 122 deletions; the guard file 1 insertion and 5 deletions. A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 8: Commit**

```bash
git add src/components/master-data/category-form.tsx tests/category-form-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): category form on the shared fields and buttons (2C batch 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing afterwards.

**For the plan 2 dev-app check:** on `/th/master-data/categories/new`, add 2 custom fields and 2 photo items.
- At 375: each photo icon button is 44px and left-aligned on its own row; the "required field" row is 44px tall.
- At 700: the 4 photo icon buttons fit inside the row with no overflow.
- At 1440: fields are 40px, the row buttons 36px. The first row's move up button and the last row's move down button are grey.
- The photo remove icon stays grey on hover.
- NVDA reads the photo item field by its hidden label.
- Saving shows the spinner in the save button while focus stays on it.

---

### Task 4: Batch 2 · `master-data/company-form.tsx` (shared fields, linked hints)

Move the company form onto the 2A fields and buttons. Spec §10 (I1–I36) first, then §4 (F1–F8 · 4.4 L1 and rows 15–16 of the 16 "other things inside `<label>`" table · 4.12 checkbox `:165` · 4.14 row and the batch 2 note on `resize-none` · 4.18 ruling 6), §6.3 rows #143–#144, §6.5.1, §6.7, §8.9 and §9.4. One file, one commit. The file has not changed since `5ffee76`, so the spec's line numbers are HEAD's.

**Task 1 must run first.** It saves `p2c-budget.mjs` in your temp folder; this task only runs it:
`// Usage: node p2c-budget.mjs <path under src/components/> NAME=from:to ... [--footer-done]   (to = 0 deletes the entry)`

Task 4 does not depend on Task 3's code. Run it after Task 3 so the commits stay in plan order.

Rulings this task applies:
- **I30 / F8:** one file, one commit. Replacement (1) imports the shared `Field` and (3) deletes the local one; make all three before you compile.
- **§10.1 / K4:** `label=` first. `required` (code, Thai name) and the 6 `maxLength` stay on the controls (GF5 floor `[2, 6, 0]`). Both code fields keep `event.target.value.toUpperCase()`.
- **F6 (§4.4 rows 15–16):** the two help lines `<p className="mt-1.5 text-xs text-muted-foreground">` under the code and asset tag code fields become `hint={t("codeHelp")}` and `hint={t("assetTagCodeHelp")}`. `Field` links each one to its field with `aria-describedby`.
- **§4.14 batch 2 note, §4.18 ruling 6:** the address `Textarea` drops `resize-none` and uses the 2A `resize-y`. It keeps `rows={4}`, and adds no `min-h-*`: `Textarea`'s `min-h-24` (96px) is about the old height at 14px.
- **K16 (§4.12):** the active checkbox uses `checkboxVariants()`; its ~40px row (group B2) keeps its classes.
- **§6.3 #143–#144, §6.5.1, §6.7:** the cancel link is `buttonVariants({ variant: "outline" })`; save is `busy={saving}` with no `disabled`. The F1 row keeps its classes.
- **Icons:** `aria-hidden="true"`, as in Task 3.
- **Ruling (spec gap), the test file:** as in Task 3, this form has no UI test file, so this task adds `tests/company-form-ui.test.ts` (1 test) to pin the hints, `busy` and the kept constraints.

What users will see (`/th/master-data/companies/new` and `…/<id>/edit`):
- The six fields get the 2A field look: 44px with 16px text on phones and 40px on desktop, white fill, 13px labels, and an orange star that screen readers skip.
- The code and asset tag code help lines are 13px faint field hints. Screen readers read each one with its field.
- The address box can now be resized vertically. On phones its text is 16px, so 4 rows make it about 16px taller.
- The active checkbox is the 2A checkbox (16px, with the focus outline).
- Save: a spinner replaces the save icon, the label stays "บันทึก", and the button keeps focus while it saves. Cancel is an outline link button.
- Codes are still typed in upper case.

Not in this task:
- the header back link `:91` (O16, 2B)
- the form panel classes `rounded-lg border border-border bg-surface p-6` (K28, 2D)
- the F1 footer row `mt-6 flex justify-end gap-3 border-t border-border pt-5` (§6.7)
- messages: the hints use the existing keys `company.codeHelp` and `company.assetTagCodeHelp`, so `messages/*.json` stay as they are

**Files:**
- Modify: `src/components/master-data/company-form.tsx` (CRLF, 3 replacements)
- Create: `tests/company-form-ui.test.ts` (new file, LF, 1 test)
- Modify: `tests/form-migration-guards.test.ts` (LF, only through `p2c-budget.mjs`)
- Temp folder only, never committed: `p2c2-precheck-4.mjs` and Task 1's `p2c-budget.mjs`
- Do not run a formatter.

**Must keep passing without edits:**
- `tests/master-data-return-navigation.test.ts:69-71`: `backHref: providedBackHref`, ``const backHref = providedBackHref ?? `/${locale}/master-data/companies` `` and `router.push(backHref)` stay in this file.
- `tests/mobile-field-navigation.test.ts:78-79`: the company new and edit routes stay focus routes.

**Interfaces:**
- Consumes:
  - 2A: `Input` (`@/components/ui/input`), `Textarea` (`…/textarea`), `Button` with `busy` and `buttonVariants`, both from `@/components/ui/button`, and `checkboxVariants` from `@/components/ui/field-variants`.
  - `Field` from `@/components/ui/field` (`label`, `required`, `hint`).
  - Plan 1 Task 7: the guard constants. Plan 2 Task 1: `p2c-budget.mjs`.
- Produces (Task 5 starts from here):
  - `master-data/company-form.tsx` is in `MIGRATED_FILES`, and its `LOCAL_FIELD`, `RAW_FIELDS`, `FIELD_CLASS_STRINGS`, `OLD_MARKUP` and `LOADER2` entries are gone. `CONSTRAINT_FLOORS` stays `[2, 6, 0]`.
  - `tests/company-form-ui.test.ts` with 1 test.

| file | `LOCAL_FIELD` | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `OLD_MARKUP` | `LOADER2` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|---|---|
| `master-data/company-form.tsx` | 1 → – | 6 → – | 6 → – | 3 → – | 1 → – | `[2, 6, 0]` unchanged |

- [ ] **Step 1: Check what this task builds on**

Save this script as `p2c2-precheck-4.mjs` in your temp folder, next to `p2c-budget.mjs` (never in the repo):

```js
// Plan 2 Task 4 precheck: run from the repo root. Confirms the primitives, the budget script of Task 1 and the guard
// entries that the company form migration starts from. Writes nothing. Never commit this file.
import { existsSync, readFileSync } from "node:fs"

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const FILE = "master-data/company-form.tsx"
const form = read(`src/components/${FILE}`)
const guard = read("tests/form-migration-guards.test.ts")
const block = (name) => new RegExp(String.raw`^const ${name}\b[\s\S]*?^[}\]]`, "m").exec(guard)?.[0] ?? ""
const entry = (name) => {
  const match = new RegExp(String.raw`\[\`\$\{C\}${FILE.replace(/[./]/g, "\\$&")}\`\]: (\d+|\[[^\]]*\])`).exec(block(name))
  return match ? match[1] : "none"
}
const listed = (name) => block(name).includes("`${C}" + FILE + "`")
const expected = { LOCAL_FIELD: "1", RAW_FIELDS: "6", FIELD_CLASS_STRINGS: "6", OLD_MARKUP: "3", LOADER2: "1", CONSTRAINT_FLOORS: "[2, 6, 0]", OLD_HELPERS: "none", REVERSE: "none", CLOSE_LABEL_IS_CANCEL: "none", FIXED_BOTTOM_BARS: "none" }
const checks = {
  "Task 1: p2c-budget.mjs is in this temp folder": existsSync(new URL("./p2c-budget.mjs", import.meta.url)),
  "2A/P0: Field takes hideLabel and hint": /hideLabel\?: boolean/.test(read("src/components/ui/field.tsx")) && /hint\?: React\.ReactNode/.test(read("src/components/ui/field.tsx")),
  "2A: checkboxVariants": /export const checkboxVariants = cva\(/.test(read("src/components/ui/field-variants.ts")),
  "2A: Button with busy, and buttonVariants from button.tsx": /busy\?: boolean/.test(read("src/components/ui/button.tsx")) && /export \{ Button, buttonVariants \}/.test(read("src/components/ui/button.tsx")),
  "2A: outline and danger variants, md and icon sizes": ["outline:", "danger:", "md: sizeMd", "icon: sizeIcon"].every((text) => read("src/components/ui/button-variants.ts").includes(text)),
  "2A: Input, NativeSelect, Textarea": /export \{ Input \}/.test(read("src/components/ui/input.tsx")) && /export \{ NativeSelect \}/.test(read("src/components/ui/native-select.tsx")) && /export \{ Textarea \}/.test(read("src/components/ui/textarea.tsx")),
  "the form is still the 5ffee76 text": /^function Field\(\{$/m.test(form) && form.includes('<p className="mt-1.5 text-xs text-muted-foreground">{t("codeHelp")}</p>') && form.includes("w-full resize-none") && form.includes("{saving ? <Loader2"),
  "tests/company-form-ui.test.ts does not exist yet": !existsSync("tests/company-form-ui.test.ts"),
  "the form is not in MIGRATED_FILES yet": !listed("MIGRATED_FILES"),
  "the form has no footer parts to wait for": !listed("PENDING_FOOTER_PARTS"),
}
for (const [name, value] of Object.entries(expected)) checks[`guard ${name} = ${value}`] = entry(name) === value
let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
const done = ["branch", "brand", "category", "company", "department", "employee", "location", "supplier"].filter((name) => block("MIGRATED_FILES").includes(`master-data/${name}-form.tsx`))
console.log(`info    batch 2 forms already in MIGRATED_FILES: ${done.join(", ") || "none"}`)
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task 4; report which.`)
  process.exit(1)
}
console.log("Task 4 preconditions hold")
```

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/master-data/company-form.tsx tests/form-migration-guards.test.ts`, then `node <temp>/p2c2-precheck-4.mjs`
Expected:
- `git status` prints nothing.
- `git ls-files --eol` prints `i/lf    w/crlf` for the form and `i/lf    w/lf` for the guard file. Keep them so.
- The script prints 20 `ok` lines, one `info` line (after Task 3 it includes `category`), and `Task 4 preconditions hold`. On any `MISSING` line, stop and report it.

- [ ] **Step 2: Lower the company form's budgets (the failing guard)**

Run: `node <temp>/p2c-budget.mjs master-data/company-form.tsx LOCAL_FIELD=1:0 RAW_FIELDS=6:0 FIELD_CLASS_STRINGS=6:0 OLD_MARKUP=3:0 LOADER2=1:0`
Expected:
```
LOCAL_FIELD: 1 -> 0
RAW_FIELDS: 6 -> 0
FIELD_CLASS_STRINGS: 6 -> 0
OLD_MARKUP: 3 -> 0
LOADER2: 1 -> 0
MIGRATED_FILES: added master-data/company-form.tsx
```
On `ABORT`, stop and report the lines it prints.

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL. Five guards fail, each naming only `src/components/master-data/company-form.tsx`:
- GF1 `1 > 0`
- GF2 `6 > 0`
- GF3 `6 > 0`
- GF7 `3 > 0` (1 old label span, 1 red star, 1 old checkbox)
- GB1 `1 > 0`

GF4 and GF8 pass.

- [ ] **Step 3: Create the failing test file `tests/company-form-ui.test.ts`**

New file, LF line endings:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/components/master-data/company-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the company form uses the shared fields with hints and a busy save button (2C batch 2)", () => {
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /function Field\(|<textarea|<button|Loader2|ml-1 text-danger|rounded border-border|resize-none|text-xs text-muted-foreground/)
  assert.equal(source.match(/<input\b/g)?.length, 1, "only the active checkbox stays a raw input")
  assert.match(source, /<input\n\s+type="checkbox"[\s\S]*?className=\{checkboxVariants\(\)\}/)
  assert.match(source, /<Field label=\{t\("code"\)\} required hint=\{t\("codeHelp"\)\}>\n\s+<Input\n/)
  assert.match(source, /<Field label=\{t\("assetTagCode"\)\} hint=\{t\("assetTagCodeHelp"\)\}>\n\s+<Input\n/)
  assert.equal(source.match(/<Field label=/g)?.length, 6)
  assert.equal(source.match(/^\s+required$/gm)?.length, 2, "code and Thai name keep the browser's own required check")
  assert.equal(source.match(/^\s+maxLength=\{\d+\}$/gm)?.length, 6)
  assert.equal(source.match(/event\.target\.value\.toUpperCase\(\)/g)?.length, 2, "both codes are still typed in upper case")
  assert.match(source, /<Textarea\n\s+value=\{values\.address \?\? ""\}/)
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}/)
})
```

Run: `node --test tests/company-form-ui.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`, on `/import \{ Field \} from "@\/components\/ui\/field"/`.

- [ ] **Step 4: Move the company form onto the primitives (`src/components/master-data/company-form.tsx`)**

Three exact replacements, top to bottom.

(1) Imports. `Loader2` goes; `ArrowLeft` stays for the header back link.

Replace:

```tsx
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useApiError } from "@/components/ui/use-api-error"
```

with:

```tsx
import { ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
```

(2) The six fields and the active checkbox. The two help lines become `hint` (F6); `resize-none` goes (§4.18 ruling 6); every `required`, `maxLength`, `placeholder` and `toUpperCase()` stays; the `<div className="md:col-span-2">` around the address stays (F4).

Replace:

```tsx
          <Field label={t("code")} required>
            <input
              value={values.code}
              onChange={(event) => setField("code", event.target.value.toUpperCase())}
              maxLength={20}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">{t("codeHelp")}</p>
          </Field>

          <Field label={t("assetTagCode")}>
            <input
              value={values.assetTagCode ?? ""}
              onChange={(event) => setField("assetTagCode", event.target.value.toUpperCase())}
              maxLength={20}
              placeholder={values.code || t("code")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">{t("assetTagCodeHelp")}</p>
          </Field>

          <Field label={t("nameTh")} required>
            <input
              value={values.nameTh}
              onChange={(event) => setField("nameTh", event.target.value)}
              maxLength={200}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>

          <Field label={t("nameEn")}>
            <input
              value={values.nameEn ?? ""}
              onChange={(event) => setField("nameEn", event.target.value)}
              maxLength={200}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>

          <Field label={t("taxId")}>
            <input
              value={values.taxId ?? ""}
              onChange={(event) => setField("taxId", event.target.value)}
              maxLength={20}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>

          <div className="md:col-span-2">
            <Field label={t("address")}>
              <textarea
                value={values.address ?? ""}
                onChange={(event) => setField("address", event.target.value)}
                rows={4}
                maxLength={500}
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </Field>
          </div>

          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
            />
```

with:

```tsx
          <Field label={t("code")} required hint={t("codeHelp")}>
            <Input
              value={values.code}
              onChange={(event) => setField("code", event.target.value.toUpperCase())}
              maxLength={20}
              required
            />
          </Field>

          <Field label={t("assetTagCode")} hint={t("assetTagCodeHelp")}>
            <Input
              value={values.assetTagCode ?? ""}
              onChange={(event) => setField("assetTagCode", event.target.value.toUpperCase())}
              maxLength={20}
              placeholder={values.code || t("code")}
            />
          </Field>

          <Field label={t("nameTh")} required>
            <Input
              value={values.nameTh}
              onChange={(event) => setField("nameTh", event.target.value)}
              maxLength={200}
              required
            />
          </Field>

          <Field label={t("nameEn")}>
            <Input
              value={values.nameEn ?? ""}
              onChange={(event) => setField("nameEn", event.target.value)}
              maxLength={200}
            />
          </Field>

          <Field label={t("taxId")}>
            <Input
              value={values.taxId ?? ""}
              onChange={(event) => setField("taxId", event.target.value)}
              maxLength={20}
            />
          </Field>

          <div className="md:col-span-2">
            <Field label={t("address")}>
              <Textarea
                value={values.address ?? ""}
                onChange={(event) => setField("address", event.target.value)}
                rows={4}
                maxLength={500}
              />
            </Field>
          </div>

          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
              className={checkboxVariants()}
            />
```

(3) Cancel link (#143), save button (#144) and the local `Field`, which ends the file. The F1 row above stays.

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
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
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
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            {tCommon("cancel")}
          </Link>
          <Button type="submit" busy={saving}>
            <Save aria-hidden="true" />
            {tCommon("save")}
          </Button>
        </div>
      </form>
    </div>
  )
}
```

Check: `grep -n "Loader2\|<input\|<select\|<textarea\|<button\|function Field\|resize-none\|text-xs" src/components/master-data/company-form.tsx` prints only the checkbox line `162:            <input`.

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/company-form-ui.test.ts tests/master-data-return-navigation.test.ts tests/visual-foundation-guards.test.ts tests/feedback-states-ui.test.ts tests/choice-controls-ui.test.ts`
Expected: PASS, 0 fail. `tests/company-form-ui.test.ts` reports 1 test.

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 1 more test than before Step 3.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git status --short src tests messages` and `git diff --stat`
Expected:
- `git status`: ` M src/components/master-data/company-form.tsx`, ` M tests/form-migration-guards.test.ts`, `?? tests/company-form-ui.test.ts`.
- `git diff --stat`: 2 files. `company-form.tsx` about 19 insertions and 49 deletions; the guard file 1 insertion and 5 deletions. A file that shows every line changed was normalized: restore its line endings before you commit.

- [ ] **Step 7: Commit**

```bash
git add src/components/master-data/company-form.tsx tests/company-form-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): company form on the shared fields with linked help hints (2C batch 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing afterwards.

**For the plan 2 dev-app check:** on `/th/master-data/companies/new`:
- At 375 the fields are 44px with 16px text, and the two hints sit under their fields at 13px.
- NVDA reads the code hint after the code field's name.
- Typing `abc` in either code field shows `ABC`.
- The address box resizes vertically.
- An empty code still gets the browser's own "please fill in" message.
- Saving keeps focus on the busy save button.

---

### Task 5: Batch 2 · `master-data/department-form.tsx`

Move the department form onto the 2A fields and buttons. Spec §4 (F1–F8 of §4.3, the batch 2 L1 row of §4.4, the checkbox row `department-form.tsx:140` of §4.12, the row of §4.14), §6.3 rows #145–#146, §6.5.1, §6.7, §8.9 (batch 2 row), §9.4 (row), §10.1 and §10.3 ("plan 2"). One file, one commit. The form is CRLF; edit it with exact-string replacement only.

Rulings this task applies:
- **I30, §4.3 F8:** one migrated file is one commit. The replacement that imports the 2A `Field` and the one that deletes the local `Field` land together, because the names clash.
- **K4, GF5:** `required` and `maxLength` stay on the controls. `Field required` only adds the orange star and `aria-required`. No field gets `error=` or `hint=`: the form shows no error or help under a field today (§4.7).
- **K13, §6.5.1:** `busy={saving}` replaces `disabled={saving}` and the `Loader2` swap. The label stays `tCommon("save")`.
- **§6.7 (#145), §6 ruling 11:** the cancel link uses `buttonVariants({ variant: "outline" })` with no `asChild` (§6 ruling 4). The F1 row `mt-6 flex justify-end gap-3 border-t border-border pt-5` keeps its classes.
- **§4.12 (ruling 14 of §4):** the checkbox takes `checkboxVariants()`. Its `<label>` row keeps its classes and its 38px height (`py-2` + a 20px line + the border). It is not one of the 9 small targets that get `min-h-11`; the rows of about 40px keep their height. Plan 1 Task 14 did the same for the asset model form. Task 9 therefore checks 44px at 375 only on the supplier "active" row (`min-h-11` today) and the category "required field" rows; if the controller wants 44px here too, that is a spec change: add `min-h-11` to this `<label>` and drop `py-2`, as on `supplier-form.tsx:229`.
- **Ruling (spec gap), the form's own test:** spec §8.9 and §10.4 name no test for this form, and the budgets in `tests/form-migration-guards.test.ts` only count old patterns. This task adds `tests/department-form-ui.test.ts`, named after the form so no other task touches it. It pins what the guards do not: the busy save button, the outline cancel link and the shared-department first option.

What users will see on `/master-data/departments/new` and `/[id]/edit`:
- Code, name and company get the 2A field look:
  - 44px with 16px text on phones, 40px with 14px from `md` (today 40px everywhere)
  - white fill, the select arrow, 13px labels
  - an orange star that screen readers do not read (they hear "required" from `aria-required`)
- The browser still blocks an empty code or name and still caps their length (K4). A server error still shows the same toast.
- Cancel looks like an outline button: 44px on phones, 40px from `md`.
- Save keeps keyboard focus while saving and shows a spinner in place of its icon. Its label does not change.
- The active checkbox is a 16px browser checkbox in the same row as before.

Not in this task:
- the header back link (O16, 2B)
- the form panel `rounded-lg border border-border bg-surface p-6` (K28, 2D) and the title block
- the submit logic and the toasts
- messages: spec §10.2 has no key for this form, so `node scripts/messages-edit.mjs` is not run
- validation UX (V track)

**Files:**
- Modify: `src/components/master-data/department-form.tsx` (CRLF, 4 replacements)
- Create: `tests/department-form-ui.test.ts` (LF, like `tests/file-evidence-ui.test.ts`)
- Modify: `tests/form-migration-guards.test.ts` (LF, through the budget script only)
- Temp folder only, never committed: `p2c2-precheck-5.mjs`, saved next to Task 1's `p2c-budget.mjs`

**Must keep passing without edits:**
- `tests/master-data-return-navigation.test.ts:69-71`: `backHref: providedBackHref`, ``const backHref = providedBackHref ?? `/${locale}/master-data/departments` `` and `router.push(backHref)` stay as they are.
- `tests/form-migration-guards.test.ts`: GF4 (both starred fields keep native `required`), GF5 (floor `[2, 2, 0]`), GF8 (the checkbox `<label>` wraps only the checkbox) and GB4 (no `disabled` next to `busy={saving}`).
- Do not run a formatter.

**Interfaces:**
- Consumes:
  - 2A: `Button` with `busy` (its default `type` is `"button"`) and `buttonVariants`, both from `@/components/ui/button`; `Input` (`@/components/ui/input`); `NativeSelect` (`@/components/ui/native-select`); `checkboxVariants` (`@/components/ui/field-variants`).
  - Plan 1 Task 2: `Field` (`label` first, `required`) from `@/components/ui/field`.
  - Plan 1 Task 7: the guard constants. Plan 1 left this form at its `5ffee76` seeds.
  - Task 1: `p2c-budget.mjs` in your temp folder (`node <temp>/p2c-budget.mjs <path under src/components/> NAME=from:to …`).
- Produces: the form in `MIGRATED_FILES` with every budget entry gone, and `CONSTRAINT_FLOORS` still `[2, 2, 0]` (code and name: `required` + `maxLength`). Task 6 follows.

| file | `LOCAL_FIELD` | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `OLD_MARKUP` | `LOADER2` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|---|---|
| `master-data/department-form.tsx` | 1 → – | 3 → – | 3 → – | 3 → – | 1 → – | `[2, 2, 0]` unchanged |

- [ ] **Step 1: Check the start state**

Save this script as `p2c2-precheck-5.mjs` in the temp folder that holds `p2c-budget.mjs` (never in the repo):

```js
// Task 5 precheck: run from the repo root. Confirms the primitives, the guard seeds and the budget script that the
// department form migration uses. Never commit this file.
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"

const FILE = "master-data/department-form.tsx"
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const form = read(`src/components/${FILE}`)
const guard = read("tests/form-migration-guards.test.ts")
const block = (name) => new RegExp(String.raw`^const ${name}\b[\s\S]*?^[}\]]`, "m").exec(guard)?.[0] ?? ""
const quoted = FILE.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")
const entry = (name) => new RegExp("\\[`\\$\\{C\\}" + quoted + "`\\]:\\s*(\\[[^\\]]*\\]|\\d+)").exec(block(name))?.[1] ?? null
const eol = execFileSync("git", ["ls-files", "--eol", `src/components/${FILE}`], { encoding: "utf8" })
const checks = {
  "2A: Button with busy, and buttonVariants": /busy\?: boolean/.test(read("src/components/ui/button.tsx")) && /export \{ Button, buttonVariants \}/.test(read("src/components/ui/button.tsx")),
  "2A: Input and NativeSelect": /function Input\(/.test(read("src/components/ui/input.tsx")) && /function NativeSelect\(/.test(read("src/components/ui/native-select.tsx")),
  "2A + plan 1 Task 2: Field and checkboxVariants": /export \{ Field,/.test(read("src/components/ui/field.tsx")) && /export const checkboxVariants = cva\(/.test(read("src/components/ui/field-variants.ts")),
  "Task 1: p2c-budget.mjs sits next to this script": existsSync(new URL("./p2c-budget.mjs", import.meta.url)),
  "the form is CRLF in the working tree": /\bw\/crlf\b/.test(eol),
  "the form still has its own Field and Loader2": /^function Field\(\{$/m.test(form) && /Loader2/.test(form),
  "the form is in BATCH_FILES batch 2": /"2": \[[^\]]*"master-data\/department-form\.tsx"/.test(guard),
  "the form is not in MIGRATED_FILES yet": !block("MIGRATED_FILES").includes(FILE),
  "LOCAL_FIELD 1": entry("LOCAL_FIELD") === "1",
  "RAW_FIELDS 3": entry("RAW_FIELDS") === "3",
  "FIELD_CLASS_STRINGS 3": entry("FIELD_CLASS_STRINGS") === "3",
  "OLD_MARKUP 3": entry("OLD_MARKUP") === "3",
  "LOADER2 1": entry("LOADER2") === "1",
  "CONSTRAINT_FLOORS [2, 2, 0]": entry("CONSTRAINT_FLOORS") === "[2, 2, 0]",
  "no entry in OLD_HELPERS, REVERSE, CLOSE_LABEL_IS_CANCEL or FIXED_BOTTOM_BARS": ["OLD_HELPERS", "REVERSE", "CLOSE_LABEL_IS_CANCEL", "FIXED_BOTTOM_BARS"].every((name) => entry(name) === null),
  "not in PENDING_FOOTER_PARTS (the form has no dialog)": !block("PENDING_FOOTER_PARTS").includes(FILE),
  "tests/department-form-ui.test.ts does not exist yet": !existsSync("tests/department-form-ui.test.ts"),
}
let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task 5; report which.`)
  process.exit(1)
}
console.log("Task 5 preconditions hold")
```

Run: `git status --short src tests messages` then `node <temp>/p2c2-precheck-5.mjs`
Expected: `git status` prints nothing. The script prints 17 `ok` lines and `Task 5 preconditions hold`. On any `MISSING` line, stop and report it.

- [ ] **Step 2: Lower the form's budgets (the failing guard)**

Run: `node <temp>/p2c-budget.mjs master-data/department-form.tsx LOCAL_FIELD=1:0 RAW_FIELDS=3:0 FIELD_CLASS_STRINGS=3:0 OLD_MARKUP=3:0 LOADER2=1:0`
Expected:
```
LOCAL_FIELD: 1 -> 0
RAW_FIELDS: 3 -> 0
FIELD_CLASS_STRINGS: 3 -> 0
OLD_MARKUP: 3 -> 0
LOADER2: 1 -> 0
MIGRATED_FILES: added master-data/department-form.tsx
```
On `ABORT`, stop and report the lines it prints.

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL. Five guards fail, each naming only `src/components/master-data/department-form.tsx`:
- GF1 `1 > 0`
- GF2 `3 > 0`
- GF3 `3 > 0`
- GF7 `3 > 0` (the old label span, the red star, the old checkbox class)
- GB1 `1 > 0`

Every other guard passes, including GF4 and GF8 on the old markup.

- [ ] **Step 3: Write the failing test `tests/department-form-ui.test.ts`**

Create the file with LF line endings:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/components/master-data/department-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the department form uses the shared fields, checkbox and buttons (2C batch 2)", () => {
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /function Field\(|<select|<textarea|Loader2|ml-1 text-danger|disabled=\{saving\}/)
  assert.equal(source.match(/<input\b/g)?.length, 1, "only the active checkbox stays a raw input")
  assert.match(source, /<Field label=\{t\("code"\)\} required>\n\s+<Input\n[\s\S]*?maxLength=\{20\}\n\s+required\n\s+\/>/)
  assert.match(source, /<Field label=\{t\("name"\)\} required>\n\s+<Input\n[\s\S]*?maxLength=\{200\}\n\s+required\n\s+\/>/)
  assert.match(source, /<Field label=\{t\("company"\)\}>\n\s+<NativeSelect\n\s+value=\{values\.companyId \?\? ""\}/)
  assert.match(source, /<option value="">\{t\("sharedDepartment"\)\}<\/option>/)
  assert.match(source, /<input\n\s+type="checkbox"[\s\S]*?className=\{checkboxVariants\(\)\}/)
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>\n\s+\{tCommon\("cancel"\)\}/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}/)
})
```

Run: `node --test tests/department-form-ui.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`. It fails first on `/import \{ Field \} from "@\/components\/ui\/field"/`.

- [ ] **Step 4: Migrate `src/components/master-data/department-form.tsx`**

Four exact replacements. Make all four before you compile: (1) imports the 2A `Field` and (4) deletes the local one, and the file type-checks only with both (§4.3 F8).

(1) Imports. `Loader2` goes. `ArrowLeft` and `Link` stay for the header back link (2B) and the cancel link.

Replace:

```tsx
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useApiError } from "@/components/ui/use-api-error"
```

with:

```tsx
import { ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { useApiError } from "@/components/ui/use-api-error"
```

(2) The three fields and the active checkbox. Each control keeps `required` and `maxLength` (K4), and `label=` stays the first prop of `Field`. The select keeps `values.companyId ?? ""` with the shared-department option first. The checkbox `<label>` keeps its classes (§4.12).

Replace:

```tsx
          <Field label={t("code")} required>
            <input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>

          <Field label={t("name")} required>
            <input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>

          <Field label={t("company")}>
            <select
              value={values.companyId ?? ""}
              onChange={(event) => setField("companyId", event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              <option value="">{t("sharedDepartment")}</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.code} - {company.nameTh}
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
          <Field label={t("code")} required>
            <Input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
            />
          </Field>

          <Field label={t("name")} required>
            <Input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
            />
          </Field>

          <Field label={t("company")}>
            <NativeSelect
              value={values.companyId ?? ""}
              onChange={(event) => setField("companyId", event.target.value)}
            >
              <option value="">{t("sharedDepartment")}</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.code} - {company.nameTh}
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

(3) The cancel link (#145) and the save button (#146). The F1 row around them keeps its classes (§6.7).

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

(4) The local `Field` goes.

Replace:

```tsx
      </form>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
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
      </form>
    </div>
  )
}
```

Check: `grep -n "Loader2\|<input\|<select\|<textarea\|<button\|function Field" src/components/master-data/department-form.tsx` prints one line, the checkbox `<input` (`type="checkbox"` is not a raw field).

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/department-form-ui.test.ts tests/master-data-return-navigation.test.ts tests/visual-foundation-guards.test.ts`
Expected: PASS, 0 fail. `tests/department-form-ui.test.ts` reports 1 test.

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 1 more test than before Step 3.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` lists 2 files: `department-form.tsx` with 15 insertions and 40 deletions, and `tests/form-migration-guards.test.ts` with 1 insertion and 5 deletions. A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).
- `git status` shows those 2 files as ` M` and `?? tests/department-form-ui.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/components/master-data/department-form.tsx tests/department-form-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): department form on the shared fields and buttons (2C batch 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. Git may warn that LF in the new test file will become CRLF in the working copy; that is expected with `core.autocrlf=true`. `git status --short src tests messages` prints nothing afterwards.

**For Task 9 (dev-app check, spec §10.5):**
- `/th/master-data/departments/new` at 375, 768 and 1440:
  - fields are 44px on the phone and 40px from 768
  - the stars are orange
  - the company select of a new department shows "แผนกกลาง / ไม่ระบุบริษัท" first
  - Cancel and Save sit side by side on the right, with Save last
  - the active row is 38px, as before (§4.12; not a 44px target, see the §4.12 ruling above); clicking its text toggles the box
- Leave the code empty and press Save: the browser stops the submit exactly as before.

---

### Task 6: Batch 2 · `master-data/employee-form.tsx`

Move the employee form onto the 2A fields and buttons. Spec §4 (F1–F8 of §4.3, the batch 2 L1 row of §4.4, the checkbox row `employee-form.tsx:292` of §4.12, the row of §4.14), §6.3 rows #147–#148, §6.5.1, §6.7, §8.9 (batch 2 row), §9.4 (row), §10.1 and §10.3 ("plan 2"). One file, one commit. The form is CRLF; edit it with exact-string replacement only.

Rulings this task applies:
- **I30, §4.3 F8:** one migrated file is one commit. The replacement that imports the 2A `Field` and the one that deletes the local `Field` land together, because the names clash.
- **K4, GF5:** `required` and `maxLength` stay on the controls: 6 `required` (code, Thai name, company, branch, department, employment status) and 5 `maxLength` (code, Thai name, English name, email, position). `type="email"` stays on the email field, so the browser still checks the address format. No field gets `error=` or `hint=` (§4.7).
- **No behavior change:** the company select keeps `onChange={(event) => handleCompanyChange(event.target.value)}`, and branch and department keep `filteredBranches` and `filteredDepartments`. Changing the company still clears a branch or department that does not belong to it.
- **K13, §6.5.1:** `busy={saving}` replaces `disabled={saving}` and the `Loader2` swap. The label stays `tCommon("save")`.
- **§6.7 (#147), §6 ruling 11:** the cancel link uses `buttonVariants({ variant: "outline" })` with no `asChild` (§6 ruling 4). The F1 row `mt-6 flex justify-end gap-3 border-t border-border pt-5` keeps its classes.
- **§4.12 (ruling 14 of §4):** the checkbox takes `checkboxVariants()`. Its `<label>` row keeps its classes and its 38px height, because it is not one of the 9 small targets that get `min-h-11`. Plan 1 Task 14 did the same for the asset model form. As in Task 5, Task 9's 44px check of the active row does not apply to this row unless the controller changes the spec.
- **Ruling (spec gap), the form's own test:** spec §8.9 and §10.4 name no test for this form. This task adds `tests/employee-form-ui.test.ts`, named after the form so no other task touches it. It pins what the guards do not: the busy save button, the outline cancel link, the email type, and the company → branch/department narrowing.

What users will see on `/master-data/employees/new` and `/[id]/edit`:
- The ten fields get the 2A field look:
  - 44px with 16px text on phones, 40px with 14px from `md` (today 40px everywhere)
  - white fill, the select arrow, 13px labels
  - an orange star that screen readers do not read (they hear "required" from `aria-required`)
- The browser still blocks the six required fields when empty, still caps the lengths and still checks the email format (K4). A server error still shows the same toast.
- Picking another company still empties a branch or department of the old company.
- Cancel looks like an outline button: 44px on phones, 40px from `md`.
- Save keeps keyboard focus while saving and shows a spinner in place of its icon. Its label does not change.
- The active checkbox is a 16px browser checkbox in the same row as before.

Not in this task:
- the header back link (O16, 2B)
- the form panel `rounded-lg border border-border bg-surface p-6` (K28, 2D) and the title block
- the submit logic, `handleCompanyChange`, the filtered lists and the toasts
- messages: spec §10.2 has no key for this form, so `node scripts/messages-edit.mjs` is not run
- validation UX (V track)

**Files:**
- Modify: `src/components/master-data/employee-form.tsx` (CRLF, 6 replacements)
- Create: `tests/employee-form-ui.test.ts` (LF, like `tests/file-evidence-ui.test.ts`)
- Modify: `tests/form-migration-guards.test.ts` (LF, through the budget script only)
- Temp folder only, never committed: `p2c2-precheck-6.mjs`, saved next to Task 1's `p2c-budget.mjs`

**Must keep passing without edits:**
- `tests/master-data-return-navigation.test.ts:69-71`: `backHref: providedBackHref`, ``const backHref = providedBackHref ?? `/${locale}/master-data/employees` `` and `router.push(backHref)` stay as they are.
- `tests/form-migration-guards.test.ts`: GF4 (the six starred fields keep native `required`), GF5 (floor `[6, 5, 0]`), GF8 (the checkbox `<label>` wraps only the checkbox) and GB4 (no `disabled` next to `busy={saving}`).
- Do not run a formatter.

**Interfaces:**
- Consumes:
  - 2A: `Button` with `busy` (its default `type` is `"button"`) and `buttonVariants`, both from `@/components/ui/button`; `Input` (`@/components/ui/input`, its `InputType` includes `"email"`); `NativeSelect` (`@/components/ui/native-select`); `checkboxVariants` (`@/components/ui/field-variants`).
  - Plan 1 Task 2: `Field` (`label` first, `required`) from `@/components/ui/field`.
  - Plan 1 Task 7: the guard constants. Plan 1 left this form at its `5ffee76` seeds.
  - Task 1: `p2c-budget.mjs` in your temp folder.
  - Task 5 is not needed: this task touches only the employee form's guard entries.
- Produces: the form in `MIGRATED_FILES` with every budget entry gone, and `CONSTRAINT_FLOORS` still `[6, 5, 0]`. The next batch 2 task follows.

| file | `LOCAL_FIELD` | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `OLD_MARKUP` | `LOADER2` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|---|---|
| `master-data/employee-form.tsx` | 1 → – | 10 → – | 10 → – | 3 → – | 1 → – | `[6, 5, 0]` unchanged |

- [ ] **Step 1: Check the start state**

Save this script as `p2c2-precheck-6.mjs` in the temp folder that holds `p2c-budget.mjs` (never in the repo):

```js
// Task 6 precheck: run from the repo root. Confirms the primitives, the guard seeds and the budget script that the
// employee form migration uses. Never commit this file.
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"

const FILE = "master-data/employee-form.tsx"
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const form = read(`src/components/${FILE}`)
const guard = read("tests/form-migration-guards.test.ts")
const block = (name) => new RegExp(String.raw`^const ${name}\b[\s\S]*?^[}\]]`, "m").exec(guard)?.[0] ?? ""
const quoted = FILE.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")
const entry = (name) => new RegExp("\\[`\\$\\{C\\}" + quoted + "`\\]:\\s*(\\[[^\\]]*\\]|\\d+)").exec(block(name))?.[1] ?? null
const eol = execFileSync("git", ["ls-files", "--eol", `src/components/${FILE}`], { encoding: "utf8" })
const checks = {
  "2A: Button with busy, and buttonVariants": /busy\?: boolean/.test(read("src/components/ui/button.tsx")) && /export \{ Button, buttonVariants \}/.test(read("src/components/ui/button.tsx")),
  "2A: Input (type email) and NativeSelect": /"email"/.test(read("src/components/ui/input.tsx")) && /function NativeSelect\(/.test(read("src/components/ui/native-select.tsx")),
  "2A + plan 1 Task 2: Field and checkboxVariants": /export \{ Field,/.test(read("src/components/ui/field.tsx")) && /export const checkboxVariants = cva\(/.test(read("src/components/ui/field-variants.ts")),
  "Task 1: p2c-budget.mjs sits next to this script": existsSync(new URL("./p2c-budget.mjs", import.meta.url)),
  "the form is CRLF in the working tree": /\bw\/crlf\b/.test(eol),
  "the form still has its own Field, Loader2 and handleCompanyChange": /^function Field\(\{$/m.test(form) && /Loader2/.test(form) && /onChange=\{\(event\) => handleCompanyChange\(event\.target\.value\)\}/.test(form),
  "the form is in BATCH_FILES batch 2": /"2": \[[^\]]*"master-data\/employee-form\.tsx"/.test(guard),
  "the form is not in MIGRATED_FILES yet": !block("MIGRATED_FILES").includes(FILE),
  "LOCAL_FIELD 1": entry("LOCAL_FIELD") === "1",
  "RAW_FIELDS 10": entry("RAW_FIELDS") === "10",
  "FIELD_CLASS_STRINGS 10": entry("FIELD_CLASS_STRINGS") === "10",
  "OLD_MARKUP 3": entry("OLD_MARKUP") === "3",
  "LOADER2 1": entry("LOADER2") === "1",
  "CONSTRAINT_FLOORS [6, 5, 0]": entry("CONSTRAINT_FLOORS") === "[6, 5, 0]",
  "no entry in OLD_HELPERS, REVERSE, CLOSE_LABEL_IS_CANCEL or FIXED_BOTTOM_BARS": ["OLD_HELPERS", "REVERSE", "CLOSE_LABEL_IS_CANCEL", "FIXED_BOTTOM_BARS"].every((name) => entry(name) === null),
  "not in PENDING_FOOTER_PARTS (the form has no dialog)": !block("PENDING_FOOTER_PARTS").includes(FILE),
  "tests/employee-form-ui.test.ts does not exist yet": !existsSync("tests/employee-form-ui.test.ts"),
}
let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
const departmentDone = block("MIGRATED_FILES").includes("master-data/department-form.tsx")
console.log(`info    Task 5 ${departmentDone ? "has" : "has not"} added department-form.tsx to MIGRATED_FILES (either is fine; this task does not touch it)`)
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task 6; report which.`)
  process.exit(1)
}
console.log("Task 6 preconditions hold")
```

Run: `git status --short src tests messages` then `node <temp>/p2c2-precheck-6.mjs`
Expected: `git status` prints nothing. The script prints 17 `ok` lines, one `info` line about Task 5 (either answer is fine) and `Task 6 preconditions hold`. On any `MISSING` line, stop and report it.

- [ ] **Step 2: Lower the form's budgets (the failing guard)**

Run: `node <temp>/p2c-budget.mjs master-data/employee-form.tsx LOCAL_FIELD=1:0 RAW_FIELDS=10:0 FIELD_CLASS_STRINGS=10:0 OLD_MARKUP=3:0 LOADER2=1:0`
Expected:
```
LOCAL_FIELD: 1 -> 0
RAW_FIELDS: 10 -> 0
FIELD_CLASS_STRINGS: 10 -> 0
OLD_MARKUP: 3 -> 0
LOADER2: 1 -> 0
MIGRATED_FILES: added master-data/employee-form.tsx
```
On `ABORT`, stop and report the lines it prints.

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL. Five guards fail, each naming only `src/components/master-data/employee-form.tsx`:
- GF1 `1 > 0`
- GF2 `10 > 0`
- GF3 `10 > 0`
- GF7 `3 > 0` (the old label span, the red star, the old checkbox class)
- GB1 `1 > 0`

Every other guard passes, including GF4 and GF8 on the old markup.

- [ ] **Step 3: Write the failing test `tests/employee-form-ui.test.ts`**

Create the file with LF line endings:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/components/master-data/employee-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the employee form uses the shared fields, checkbox and buttons (2C batch 2)", () => {
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /function Field\(|<select|<textarea|Loader2|ml-1 text-danger|disabled=\{saving\}/)
  assert.equal(source.match(/<input\b/g)?.length, 1, "only the active checkbox stays a raw input")
  assert.equal(source.match(/<Field label=\{t\("\w+"\)\} required>/g)?.length, 6)
  assert.equal(source.match(/<Field label=\{t\("\w+"\)\}>/g)?.length, 4)
  assert.equal(source.match(/^\s+required$/gm)?.length, 6, "each starred field keeps the browser's own required check")
  assert.equal(source.match(/^\s+maxLength=\{\d+\}$/gm)?.length, 5)
  assert.match(source, /<Input\n\s+type="email"\n\s+value=\{values\.email \?\? ""\}/)
  assert.match(source, /<input\n\s+type="checkbox"[\s\S]*?className=\{checkboxVariants\(\)\}/)
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>\n\s+\{tCommon\("cancel"\)\}/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}/)
})

test("the employee form still narrows branch and department to the chosen company", () => {
  assert.match(source, /<Field label=\{t\("company"\)\} required>\n\s+<NativeSelect\n\s+value=\{values\.companyId\}\n\s+onChange=\{\(event\) => handleCompanyChange\(event\.target\.value\)\}/)
  assert.match(source, /<Field label=\{t\("branch"\)\} required>\n\s+<NativeSelect[\s\S]*?>\n\s+<option value="">\{t\("selectBranch"\)\}<\/option>\n\s+\{filteredBranches\.map\(/)
  assert.match(source, /<Field label=\{t\("department"\)\} required>\n\s+<NativeSelect[\s\S]*?>\n\s+<option value="">\{t\("selectDepartment"\)\}<\/option>\n\s+\{filteredDepartments\.map\(/)
})
```

Run: `node --test tests/employee-form-ui.test.ts`
Expected: FAIL, `tests 2 · pass 0 · fail 2`. The first test fails first on `/import \{ Field \} from "@\/components\/ui\/field"/`, the second on the company `<NativeSelect` pattern.

- [ ] **Step 4: Migrate `src/components/master-data/employee-form.tsx`**

Six exact replacements. Make all six before you compile: (1) imports the 2A `Field` and (6) deletes the local one, and the file type-checks only with both (§4.3 F8).

(1) Imports. `Loader2` goes. `ArrowLeft` and `Link` stay for the header back link (2B) and the cancel link.

Replace:

```tsx
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useApiError } from "@/components/ui/use-api-error"
```

with:

```tsx
import { ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { useApiError } from "@/components/ui/use-api-error"
```

(2) Code, Thai name, English name and email. Each control keeps `required` and `maxLength` (K4), the email field keeps `type="email"` as its first prop, and `label=` stays the first prop of `Field`.

Replace:

```tsx
          <Field label={t("code")} required>
            <input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>

          <Field label={t("fullNameTh")} required>
            <input
              value={values.fullNameTh}
              onChange={(event) => setField("fullNameTh", event.target.value)}
              maxLength={200}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>

          <Field label={t("fullNameEn")}>
            <input
              value={values.fullNameEn ?? ""}
              onChange={(event) => setField("fullNameEn", event.target.value)}
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
```

with:

```tsx
          <Field label={t("code")} required>
            <Input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
            />
          </Field>

          <Field label={t("fullNameTh")} required>
            <Input
              value={values.fullNameTh}
              onChange={(event) => setField("fullNameTh", event.target.value)}
              maxLength={200}
              required
            />
          </Field>

          <Field label={t("fullNameEn")}>
            <Input
              value={values.fullNameEn ?? ""}
              onChange={(event) => setField("fullNameEn", event.target.value)}
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
```

(3) Company, branch and department. Company keeps `handleCompanyChange`; branch and department keep the filtered lists. All three keep `required`.

Replace:

```tsx
          <Field label={t("company")} required>
            <select
              value={values.companyId}
              onChange={(event) => handleCompanyChange(event.target.value)}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              <option value="">{t("selectCompany")}</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.code} - {company.nameTh}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("branch")} required>
            <select
              value={values.branchId}
              onChange={(event) => setField("branchId", event.target.value)}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              <option value="">{t("selectBranch")}</option>
              {filteredBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.code} - {branch.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("department")} required>
            <select
              value={values.departmentId}
              onChange={(event) => setField("departmentId", event.target.value)}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              <option value="">{t("selectDepartment")}</option>
              {filteredDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} - {department.name}
                </option>
              ))}
            </select>
          </Field>
```

with:

```tsx
          <Field label={t("company")} required>
            <NativeSelect
              value={values.companyId}
              onChange={(event) => handleCompanyChange(event.target.value)}
              required
            >
              <option value="">{t("selectCompany")}</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.code} - {company.nameTh}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label={t("branch")} required>
            <NativeSelect
              value={values.branchId}
              onChange={(event) => setField("branchId", event.target.value)}
              required
            >
              <option value="">{t("selectBranch")}</option>
              {filteredBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.code} - {branch.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label={t("department")} required>
            <NativeSelect
              value={values.departmentId}
              onChange={(event) => setField("departmentId", event.target.value)}
              required
            >
              <option value="">{t("selectDepartment")}</option>
              {filteredDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} - {department.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
```

(4) Position, employment status, manager and the active checkbox. Employment status keeps `required` and its `EmployeeFormValues["employmentStatus"]` cast. The checkbox `<label>` keeps its classes (§4.12).

Replace:

```tsx
          <Field label={t("position")}>
            <input
              value={values.position ?? ""}
              onChange={(event) => setField("position", event.target.value)}
              maxLength={200}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>

          <Field label={t("employmentStatus")} required>
            <select
              value={values.employmentStatus}
              onChange={(event) =>
                setField("employmentStatus", event.target.value as EmployeeFormValues["employmentStatus"])
              }
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              <option value="active">{t("statusActive")}</option>
              <option value="resigned">{t("statusResigned")}</option>
              <option value="suspended">{t("statusSuspended")}</option>
            </select>
          </Field>

          <Field label={t("manager")}>
            <select
              value={values.managerId ?? ""}
              onChange={(event) => setField("managerId", event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              <option value="">{t("noManager")}</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.code} - {manager.fullNameTh}
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
          <Field label={t("position")}>
            <Input
              value={values.position ?? ""}
              onChange={(event) => setField("position", event.target.value)}
              maxLength={200}
            />
          </Field>

          <Field label={t("employmentStatus")} required>
            <NativeSelect
              value={values.employmentStatus}
              onChange={(event) =>
                setField("employmentStatus", event.target.value as EmployeeFormValues["employmentStatus"])
              }
              required
            >
              <option value="active">{t("statusActive")}</option>
              <option value="resigned">{t("statusResigned")}</option>
              <option value="suspended">{t("statusSuspended")}</option>
            </NativeSelect>
          </Field>

          <Field label={t("manager")}>
            <NativeSelect
              value={values.managerId ?? ""}
              onChange={(event) => setField("managerId", event.target.value)}
            >
              <option value="">{t("noManager")}</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.code} - {manager.fullNameTh}
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

(5) The cancel link (#147) and the save button (#148). The F1 row around them keeps its classes (§6.7).

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

(6) The local `Field` goes.

Replace:

```tsx
      </form>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
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
      </form>
    </div>
  )
}
```

Check: `grep -n "Loader2\|<input\|<select\|<textarea\|<button\|function Field" src/components/master-data/employee-form.tsx` prints one line, the checkbox `<input` (`type="checkbox"` is not a raw field).

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/employee-form-ui.test.ts tests/master-data-return-navigation.test.ts tests/visual-foundation-guards.test.ts`
Expected: PASS, 0 fail. `tests/employee-form-ui.test.ts` reports 2 tests.

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 2 more tests than before Step 3.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` lists 2 files: `employee-form.tsx` with 26 insertions and 58 deletions, and `tests/form-migration-guards.test.ts` with 1 insertion and 5 deletions. A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).
- `git status` shows those 2 files as ` M` and `?? tests/employee-form-ui.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/components/master-data/employee-form.tsx tests/employee-form-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): employee form on the shared fields and buttons (2C batch 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. Git may warn that LF in the new test file will become CRLF in the working copy; that is expected with `core.autocrlf=true`. `git status --short src tests messages` prints nothing afterwards.

**For Task 9 (dev-app check, spec §10.5):**
- `/th/master-data/employees/new` at 375, 768 and 1440:
  - fields are 44px on the phone and 40px from 768, and the two-column grid from `md` stays level
  - six orange stars
  - Cancel and Save sit side by side on the right, with Save last
  - the active row is 38px, as before (§4.12; not a 44px target, see the §4.12 ruling above); clicking its text toggles the box
- Pick a company, a branch and a department, then switch company: a branch or department that does not belong to the new company goes back to "เลือกสาขา" / "เลือกแผนก" (a shared department stays).
- Type an address without `@` in the email field and press Save: the browser stops the submit exactly as before.

---

### Task 7: Batch 2 · `master-data/location-form.tsx`

Move the location form onto the 2A fields and buttons. Spec §4 (4.3 rules F1–F8, 4.12 checkbox `location-form.tsx:192`, 4.14 row and the batch 2 note "`location-form.tsx:208` drops `resize-none`"), §6.3 rows #149–#150, §6.7 (the cancel link), §8.9 batch 2 row, §9.4 row and §9.7 row 2. One file, one commit (I30). The form is CRLF; edit it with exact-string replacement only.

What changes:
- **Fields:** code and name become `Input`; branch, location type and parent location become `NativeSelect`; the description becomes `Textarea` (`resize-none` goes, so the box resizes vertically like every 2A textarea). Every control keeps `required` and `maxLength` exactly as today (K4, GF5). `label=` stays the first prop of `Field`.
- **Checkbox:** the active checkbox uses `checkboxVariants()`. Its `<label>` row keeps its classes (it is not one of the 9 small hit areas of §4.12).
- **Buttons, per §6.3:**
  - #149 cancel link: `buttonVariants({ variant: "outline" })`
  - #150 save: `busy={saving}` and `disabled={branches.length === 0}`. The no-branch gate stays (K4), only `saving` moves to `busy` (K13, GB4).
- **Local `Field`:** deleted. The 2A `Field` replaces it (F8).

What users will see:
- 44px fields with 16px text on phones and 40px on desktop (the desktop height is 40 already), white fill, 13px labels, the select chevron, and an orange star that screen readers do not read (they get `aria-required`).
- The description box can be resized vertically.
- Save keeps focus and shows a spinner while saving. With no branch to pick it is grey (the 2A disabled look) instead of faded blue.

Not in this task:
- the header back link `:112-118` (O16, 2B)
- the form panel classes (K28, 2D)
- the F1 footer row `mt-6 flex justify-end gap-3 border-t border-border pt-5`, which keeps its classes (§6.7)
- message keys: batch 2 adds none (§10.2), so `messages/*.json` are not touched
- validation behavior: no toast, `required`, `maxLength` or `disabled` gate changes (K4, V track)
- no deploy

**Ruling (spec gap), the test file:** the location form has no UI test file of its own; `tests/master-data-return-navigation.test.ts` reads it only for the return link. Like Tasks 1–6 (Task 1's ruling), this task creates `tests/location-form-ui.test.ts`. It pins what the guards cannot see: the kept save gate `disabled={branches.length === 0}`, that Save uses `busy`, the cancel link and the four `required` controls.

**Files:**
- Modify: `src/components/master-data/location-form.tsx` (CRLF, 5 replacements)
- Create: `tests/location-form-ui.test.ts` (LF, 1 test)
- Modify: `tests/form-migration-guards.test.ts` (LF, only through `p2c-budget.mjs`)
- Temp folder only, never committed: `p2c2-precheck-7.mjs` and the `p2c-budget.mjs` that Task 1 saved
- Do not run a formatter.

**Must keep passing without edits (spec §10.4 table D, §9.7 row 2):**
- `tests/master-data-return-navigation.test.ts:69-71`: `backHref: providedBackHref`, ``const backHref = providedBackHref ?? `/${locale}/master-data/locations` `` and `router.push(backHref)` stay in this file.

**Interfaces:**
- Consumes:
  - 2A: `Field` (`label`, `required`; children an element) from `@/components/ui/field`; `Input`, `NativeSelect`, `Textarea`; `Button` (default `type="button"`, `busy`) and `buttonVariants` from `@/components/ui/button`; `checkboxVariants` from `@/components/ui/field-variants`.
  - Task 1: `<temp>/p2c-budget.mjs` (same script as plan 1 Task 9 Step 2). If it is missing, save it again from Task 1 before Step 2.
  - Tasks 1–6 left the branch, brand, category, company, department and employee forms in `MIGRATED_FILES` (32 entries).
- Produces: the location form in `MIGRATED_FILES` (33 entries) and every budget entry of the file gone. `CONSTRAINT_FLOORS` stays `[4, 3, 0]` (`required` on code, name, branch and location type; `maxLength` 50, 200 and 500). `tests/location-form-ui.test.ts` with 1 test. Task 8 starts from here.

| file | `LOCAL_FIELD` | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `OLD_MARKUP` | `LOADER2` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|---|---|
| `master-data/location-form.tsx` | 1 → – | 6 → – | 6 → – | 3 → – | 1 → – | `[4, 3, 0]` unchanged |

- [ ] **Step 1: Check what this task builds on**

Save this script as `p2c2-precheck-7.mjs` in your temp folder, next to `p2c-budget.mjs` (never in the repo):

```js
// Task 7 precheck: run from the repo root. Confirms Tasks 1-6 landed, the budget script is saved, and the location
// form is still the text this task quotes. Never commit this file.
import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const count = (text, literal) => text.split(literal).length - 1
const guard = read("tests/form-migration-guards.test.ts")
const form = read("src/components/master-data/location-form.tsx")
const block = (name) => new RegExp(`^const ${name}\\b[\\s\\S]*?^[}\\]]`, "m").exec(guard)?.[0] ?? ""
// The value of one budget entry, as written: "6" or "[4, 3, 0]". null when the file has no entry.
const entry = (name, path) => {
  const line = block(name).split("\n").find((text) => text.includes("[`${C}" + path + "`]:"))
  return line ? line.split("]:")[1].replace(/,?\s*(?:\/\/.*)?$/, "").trim() : null
}
const migrated = (path) => block("MIGRATED_FILES").includes("`${C}" + path + "`")
const LOCATION = "master-data/location-form.tsx"
const BEFORE = ["branch", "brand", "category", "company", "department", "employee"].map((name) => `master-data/${name}-form.tsx`)
const BUDGETS = ["LOCAL_FIELD", "RAW_FIELDS", "FIELD_CLASS_STRINGS", "OLD_MARKUP", "LOADER2"]
const fieldClass = 'className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"'

const checks = {
  "Task 1: p2c-budget.mjs sits next to this script": existsSync(fileURLToPath(new URL("./p2c-budget.mjs", import.meta.url))),
  "2A: Field, Input, NativeSelect, Textarea, Button + buttonVariants, checkboxVariants":
    /export \{ Field,/.test(read("src/components/ui/field.tsx")) &&
    /export \{ Input \}/.test(read("src/components/ui/input.tsx")) &&
    /export \{ NativeSelect \}/.test(read("src/components/ui/native-select.tsx")) &&
    /export \{ Textarea \}/.test(read("src/components/ui/textarea.tsx")) &&
    /export \{ Button, buttonVariants \}/.test(read("src/components/ui/button.tsx")) &&
    /export const checkboxVariants = cva\(/.test(read("src/components/ui/field-variants.ts")),
  "Tasks 1-6: branch, brand, category, company, department and employee forms are in MIGRATED_FILES": BEFORE.every(migrated),
  "location form is not in MIGRATED_FILES yet": !migrated(LOCATION),
  "budgets: LOCAL_FIELD 1, RAW_FIELDS 6, FIELD_CLASS_STRINGS 6, OLD_MARKUP 3, LOADER2 1":
    [1, 6, 6, 3, 1].every((value, index) => entry(BUDGETS[index], LOCATION) === String(value)),
  "CONSTRAINT_FLOORS is [4, 3, 0]": entry("CONSTRAINT_FLOORS", LOCATION) === "[4, 3, 0]",
  "form: local function Field, 5 field class strings, resize-none, the Loader2 save": count(form, "function Field({") === 1 && count(form, fieldClass) === 5 && count(form, "resize-none") === 1 && count(form, "Loader2") === 2,
  "form: the save button gate disabled={saving || branches.length === 0}": count(form, "disabled={saving || branches.length === 0}") === 1,
}
let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task 7; report which.`)
  process.exit(1)
}
console.log("Task 7 preconditions hold")
```

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/master-data/location-form.tsx tests/form-migration-guards.test.ts`, then `node <temp>/p2c2-precheck-7.mjs`
Expected:
- `git status` prints nothing.
- `git ls-files --eol` prints `i/lf w/crlf` for the form and `i/lf w/lf` for the guard file. Keep both.
- The script prints 8 `ok` lines and `Task 7 preconditions hold`. On any `MISSING` line, stop and report it.

- [ ] **Step 2: Lower the location form's budgets (the failing guard)**

Run: `node <temp>/p2c-budget.mjs master-data/location-form.tsx LOCAL_FIELD=1:0 RAW_FIELDS=6:0 FIELD_CLASS_STRINGS=6:0 OLD_MARKUP=3:0 LOADER2=1:0`
Expected:
```
LOCAL_FIELD: 1 -> 0
RAW_FIELDS: 6 -> 0
FIELD_CLASS_STRINGS: 6 -> 0
OLD_MARKUP: 3 -> 0
LOADER2: 1 -> 0
MIGRATED_FILES: added master-data/location-form.tsx
```
On `ABORT`, stop and report the lines it prints.

- [ ] **Step 3: Run the guards and confirm they fail for the right reason**

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 18 · fail 5`. Five guards fail, each naming only `src/components/master-data/location-form.tsx`:
- GF1 `1 > 0`
- GF2 `6 > 0` (2 inputs, 3 selects, 1 textarea)
- GF3 `6 > 0`
- GF7 `3 > 0` (the label span, the red star, the checkbox classes)
- GB1 `1 > 0`

Every other guard passes, including GF4 (each starred field already has native `required`) and GF8.

- [ ] **Step 4: Create the failing test `tests/location-form-ui.test.ts`**

Create the file with this content, LF line endings:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Phase 2C batch 2 (spec 2C §8.9): the location form on the shared fields and buttons. The form is CRLF in the
// working tree, so the source is read with \r stripped before the multi-line regexes.
const source = readFileSync("src/components/master-data/location-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the location form uses the shared fields and a busy save button that still waits for a branch (2C batch 2)", () => {
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /function Field\(|<select|<textarea|<button|Loader2|ml-1 text-danger|resize-none/)
  assert.equal(source.match(/<input\b/g)?.length, 1, "only the active checkbox stays a native input")
  assert.equal(source.match(/<Field label=\{t\("(?:code|name|branch|locationType)"\)\} required>/g)?.length, 4)
  assert.equal(source.match(/^\s+required$/gm)?.length, 4, "code, name, branch and location type keep the browser's own required check")
  assert.match(source, /<Textarea\n\s+value=\{values\.description \?\? ""\}\n[^\n]*\n\s+rows=\{4\}\n\s+maxLength=\{500\}\n\s+\/>/)
  assert.match(source, /className=\{checkboxVariants\(\)\}/)
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>\n\s+\{tCommon\("cancel"\)\}/)
  assert.match(source, /<Button type="submit" busy=\{saving\} disabled=\{branches\.length === 0\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}/)
})
```

Run: `node --test tests/location-form-ui.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`. The test fails first on `/import \{ Field \} from "@\/components\/ui\/field"/`.

- [ ] **Step 5: Migrate `src/components/master-data/location-form.tsx`**

Five exact replacements. Make all five before you compile: (1) imports the 2A `Field` and (5) deletes the local `Field`, and the file type-checks only with both (§4.3 F8).

(1) Imports. `Loader2` goes; `ArrowLeft` stays for the header back link.

Replace:

```tsx
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { locationTypes } from "@/lib/validations/location"
import { useApiError } from "@/components/ui/use-api-error"
```

with:

```tsx
import { ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { locationTypes } from "@/lib/validations/location"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
```

(2) Code, name, branch, location type, parent location and the active checkbox. Each control keeps `required` and `maxLength` (K4). The `{tCommon("active")}` line and `</label>` after this block stay.

Replace:

```tsx
          <Field label={t("code")} required>
            <input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={50}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>

          <Field label={t("name")} required>
            <input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>

          <Field label={t("branch")} required>
            <select
              value={values.branchId}
              onChange={(event) => setField("branchId", event.target.value)}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              <option value="">{t("selectBranch")}</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.company.code} / {branch.code} - {branch.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("locationType")} required>
            <select
              value={values.locationType}
              onChange={(event) =>
                setField("locationType", event.target.value as LocationFormValues["locationType"])
              }
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              {locationTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("parentLocation")}>
            <select
              value={values.parentId ?? ""}
              onChange={(event) => setField("parentId", event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              <option value="">{t("noParent")}</option>
              {parentLocations.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.code} - {parent.name}
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
          <Field label={t("code")} required>
            <Input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={50}
              required
            />
          </Field>

          <Field label={t("name")} required>
            <Input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
            />
          </Field>

          <Field label={t("branch")} required>
            <NativeSelect
              value={values.branchId}
              onChange={(event) => setField("branchId", event.target.value)}
              required
            >
              <option value="">{t("selectBranch")}</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.company.code} / {branch.code} - {branch.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label={t("locationType")} required>
            <NativeSelect
              value={values.locationType}
              onChange={(event) =>
                setField("locationType", event.target.value as LocationFormValues["locationType"])
              }
              required
            >
              {locationTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label={t("parentLocation")}>
            <NativeSelect
              value={values.parentId ?? ""}
              onChange={(event) => setField("parentId", event.target.value)}
            >
              <option value="">{t("noParent")}</option>
              {parentLocations.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.code} - {parent.name}
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

(3) Description. `Textarea` brings `min-h-24`, `py-2` and `resize-y`; `rows={4}` and `maxLength={500}` stay. The `<div className="md:col-span-2">` around it stays (F4).

Replace:

```tsx
            <Field label={t("description")}>
              <textarea
                value={values.description ?? ""}
                onChange={(event) => setField("description", event.target.value)}
                rows={4}
                maxLength={500}
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </Field>
```

with:

```tsx
            <Field label={t("description")}>
              <Textarea
                value={values.description ?? ""}
                onChange={(event) => setField("description", event.target.value)}
                rows={4}
                maxLength={500}
              />
            </Field>
```

(4) Cancel link (#149) and save button (#150). The F1 row around them keeps its classes.

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
            disabled={saving || branches.length === 0}
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
          <Button type="submit" busy={saving} disabled={branches.length === 0}>
            <Save aria-hidden="true" />
            {tCommon("save")}
          </Button>
```

(5) The local `Field` goes.

Replace:

```tsx
      </form>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
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
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Check the result**

Run: `grep -n "Loader2\|<input\|<select\|<textarea\|<button\|function Field\|resize-none\|disabled=" src/components/master-data/location-form.tsx`
Expected: exactly two lines, the checkbox `<input` (`type="checkbox"` is not a raw field) and `<Button type="submit" busy={saving} disabled={branches.length === 0}>`.

Run: `git ls-files --eol src/components/master-data/location-form.tsx`
Expected: `i/lf w/crlf`, as before.

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `node --test tests/form-migration-guards.test.ts tests/location-form-ui.test.ts tests/master-data-return-navigation.test.ts tests/visual-foundation-guards.test.ts tests/field-primitives.test.ts`
Expected: PASS, 0 fail. `tests/form-migration-guards.test.ts` reports 23 tests.

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 1 more test than after Task 6.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: `git diff --stat` shows exactly 2 files. `location-form.tsx` shows 21 insertions and 48 deletions; `tests/form-migration-guards.test.ts` 1 insertion and 5 deletions. `git status` also lists `?? tests/location-form-ui.test.ts` (19 lines). A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 9: Commit**

```bash
git add src/components/master-data/location-form.tsx tests/location-form-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): location form on the shared fields and a busy save button (2C batch 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing afterwards.

**For the plan's dev-app check (`/th/master-data/locations/new` and `/th/master-data/locations/<id>/edit`, at 375, 768 and 1440):**
- the fields are 44px with 16px text on phones and 40px on desktop; the selects show the chevron; the stars are orange
- the description box resizes vertically
- with no branch in the list, Save is grey and cannot be pressed; while saving it keeps focus and shows a spinner
- the cancel link looks like an outline button and goes back to the list, keeping `returnTo`

---

### Task 8: Batch 2 · `master-data/supplier-form.tsx` (six field errors in `Field`, the end state of batch 2)

Move the supplier form onto the 2A fields and buttons, and move its six existing field errors into `Field error=` (K4 a). Spec §4.3 F3 (`controlClassName`), §4.4 (row "L1 + error" and the supplier `Field id` table), §4.6 (5 inputs 44 → 40 on desktop), §4.7 (the toast `:127` stays), §4.12 (checkbox `:230`; the row `:229` keeps `min-h-11`), §4.16 (`tests/supplier-form-ui.test.ts:18-20`), §6.3 rows #151–#152, §6.7, §8.9 batch 2 row, §9.4 row, §9.5 row 2, §9.7 row 2 and §9.8 (`confirm({ title:`). One file, one commit (I30). The form and its test are CRLF; edit them with exact-string replacement only.

What changes:
- **Fields:** the five inputs become `Input`, the address becomes `Textarea`. Every control keeps `required`, `maxLength`, `type`, `inputMode` and `autoComplete` exactly as today (K4, GF5, `tests/supplier-form-ui.test.ts:8-12`).
- **Field errors (K4 a):** `<Field label={…} required error={…} errorId="supplier-code-error">` becomes `<Field label={…} id="supplier-code" required error={…}>`. The hand-set `aria-invalid` and `aria-describedby` leave the controls, because `Field` sets both. The error ids stay the same, because `Field` names its error `${id}-error` (§4.4):

  | field | `Field id` | error id (unchanged) |
  |---|---|---|
  | code | `supplier-code` | `supplier-code-error` |
  | name | `supplier-name` | `supplier-name-error` |
  | contactPerson | `supplier-contact` | `supplier-contact-error` |
  | phone | `supplier-phone` | `supplier-phone-error` |
  | email | `supplier-email` | `supplier-email-error` |
  | address | `supplier-address` | `supplier-address-error` |

- **`controlClassName`** (`:40`) goes (F3). The address keeps `min-h-28`; `py-2` comes from `Textarea`.
- **Checkbox:** `checkboxVariants()`. The `<label>` row keeps `min-h-11` (`tests/supplier-form-ui.test.ts:13` passes on that line once `controlClassName` is gone).
- **Buttons, per §6.3:**
  - #151 cancel link: `buttonVariants({ variant: "outline" })`, keeping `onClick={confirmNavigation}` (it asks before dropping unsaved changes)
  - #152 save: `busy={saving}`, no `disabled`
- **Local `Field`:** deleted (F8). Its error `<span role="alert">` inside the `<label>` becomes the 2A `FieldError` (`<p role="alert">`) under the control.

What users will see:
- Desktop fields and buttons drop from 44px to 40px (K7); phones keep 44px with 16px text. White fill, 13px labels, orange stars that screen readers do not read.
- A field the server rejects (duplicate code, bad email, too long) gets a red border and halo, and its message sits under the field in 13px. Screen readers still hear the message (`role="alert"`) and find it from the field (`aria-describedby`). The toast for the first error stays (§4.7).
- Leaving with unsaved changes still asks first, with the same confirm (batch 5 restyles it).
- Save keeps focus and shows a spinner while saving.

Not in this task:
- the `confirm()` at `:93`: batch 5 adds `confirmLabel: t("unsavedChangesLeave")` and the key `supplier.unsavedChangesLeave` (§5.10, §10.2). Leave it exactly as it is: `tests/supplier-form-ui.test.ts:27` pins `confirm({ title: t("unsavedChangesConfirm")`.
- the header back link `:152-159` (O16, 2B)
- the form panel classes (K28, 2D) and the F1 footer row `mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:flex sm:justify-end` (§6.7)
- message keys: none (batch 2 adds no key), so `messages/*.json` are not touched
- validation behavior: `parseSupplierFormError`, `setFieldErrors`, the toast and the native checks stay; no V-track change
- no deploy

**Rulings:**
- **Spec §4.16 test, one addition:** besides the four asserts of §4.16, the rewritten test also checks that no `aria-invalid=` or `aria-describedby=` is left in the file. `Field` merges a child's own `aria-describedby` with its error id, so a leftover pair would name the error twice.
- **One appended test** pins the buttons and the checkbox (busy save, outline cancel that keeps `confirmNavigation`), in the same way plan 1 Task 9 pinned its forms.
- **Save icon:** `<Save aria-hidden="true" />` keeps the attribute it has today (§6.2.5).

**Files:**
- Modify: `src/components/master-data/supplier-form.tsx` (CRLF, 6 replacements)
- Modify: `tests/supplier-form-ui.test.ts` (CRLF: replace the test at `:16-22`, append 1 test)
- Modify: `tests/form-migration-guards.test.ts` (LF, only through `p2c-budget.mjs`)
- Temp folder only, never committed: `p2c2-precheck-8.mjs`, `p2c2-guard-state.mjs` and the `p2c-budget.mjs` that Task 1 saved
- Do not run a formatter.

**Must keep passing without edits (spec §9.7 row 2, §9.8):**
- `tests/supplier-form-ui.test.ts:8-13` (`type="tel"`, `inputMode="tel"`, the three `autoComplete` values, `min-h-11` from the checkbox row), `:17`, `:21`, `:25-28` (`addEventListener("beforeunload"`, `removeEventListener("beforeunload"`, `confirm({ title: t("unsavedChangesConfirm")` on one line, `confirmNavigation`), `:31-40` (keys)
- `tests/ui-overlay-guards.test.ts:39-49`: `shouldGuardLinkClick(` and `confirm({` stay in this file.
- `tests/master-data-return-navigation.test.ts:69-71`: `backHref: providedBackHref`, ``const backHref = providedBackHref ?? `/${locale}/master-data/suppliers` `` and `router.push(backHref)`.
- `tests/supplier-form-errors.test.ts`: `src/lib/supplier-form-errors.ts` is not touched.
- `tests/supplier-form-ui.test.ts` reads the file without stripping `\r`: every new regex in it stays on one line (no `\n`).

**Interfaces:**
- Consumes:
  - 2A: `Field` (`label`, `id`, `required`, `error`; children an element) from `@/components/ui/field`. With no `id` on the child, the control id is `Field`'s `id`, the error id is `${id}-error`, and the error renders as `FieldError` (`role="alert"`). `Input`, `Textarea`, `Button` (`busy`), `buttonVariants`, `checkboxVariants`.
  - Task 1: `<temp>/p2c-budget.mjs`.
  - Tasks 1–7 left the other seven batch-2 forms in `MIGRATED_FILES` (33 entries) with no budget entries.
- Produces: the end state of batch 2 (Step 9). `CONSTRAINT_FLOORS` stays `[2, 6, 0]` (`required` on code and name; `maxLength` 20, 200, 200, 50, 200 and 500).

| file | `LOCAL_FIELD` | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `OLD_MARKUP` | `LOADER2` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|---|---|
| `master-data/supplier-form.tsx` | 1 → – | 6 → – | 1 → – | 3 → – | 1 → – | `[2, 6, 0]` unchanged |

`FIELD_CLASS_STRINGS` is 1 because the six controls share the one `controlClassName` string.

- [ ] **Step 1: Check what this task builds on**

Save this script as `p2c2-precheck-8.mjs` in your temp folder, next to `p2c-budget.mjs` (never in the repo):

```js
// Task 8 precheck: run from the repo root. Confirms Tasks 1-7 landed, Field still names its error `${id}-error`, and the
// supplier form and its test are still the text this task quotes. Never commit this file.
import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const count = (text, literal) => text.split(literal).length - 1
const guard = read("tests/form-migration-guards.test.ts")
const form = read("src/components/master-data/supplier-form.tsx")
const uiTest = read("tests/supplier-form-ui.test.ts")
const field = read("src/components/ui/field.tsx")
const block = (name) => new RegExp(`^const ${name}\\b[\\s\\S]*?^[}\\]]`, "m").exec(guard)?.[0] ?? ""
// The value of one budget entry, as written: "6" or "[2, 6, 0]". null when the file has no entry.
const entry = (name, path) => {
  const line = block(name).split("\n").find((text) => text.includes("[`${C}" + path + "`]:"))
  return line ? line.split("]:")[1].replace(/,?\s*(?:\/\/.*)?$/, "").trim() : null
}
const migrated = (path) => block("MIGRATED_FILES").includes("`${C}" + path + "`")
const SUPPLIER = "master-data/supplier-form.tsx"
const BEFORE = ["branch", "brand", "category", "company", "department", "employee", "location"].map((name) => `master-data/${name}-form.tsx`)
const BUDGETS = ["LOCAL_FIELD", "RAW_FIELDS", "FIELD_CLASS_STRINGS", "OLD_MARKUP", "LOADER2"]

const checks = {
  "Task 1: p2c-budget.mjs sits next to this script": existsSync(fileURLToPath(new URL("./p2c-budget.mjs", import.meta.url))),
  "Field takes id and names the error `${controlId}-error`; FieldError has role=alert":
    /const controlId = element\?\.props\.id \?\? id \?\? generatedId/.test(field) &&
    field.includes("const errorId = error ? `${controlId}-error` : undefined") &&
    /<p data-slot="field-error" role="alert"/.test(field),
  "2A: Input, Textarea, Button + buttonVariants, checkboxVariants":
    /export \{ Input \}/.test(read("src/components/ui/input.tsx")) &&
    /export \{ Textarea \}/.test(read("src/components/ui/textarea.tsx")) &&
    /export \{ Button, buttonVariants \}/.test(read("src/components/ui/button.tsx")) &&
    /export const checkboxVariants = cva\(/.test(read("src/components/ui/field-variants.ts")),
  "Tasks 1-7: the other seven batch-2 forms are in MIGRATED_FILES with no budget left": BEFORE.every((path) => migrated(path) && BUDGETS.every((name) => entry(name, path) === null)),
  "supplier form is not in MIGRATED_FILES yet": !migrated(SUPPLIER),
  "budgets: LOCAL_FIELD 1, RAW_FIELDS 6, FIELD_CLASS_STRINGS 1, OLD_MARKUP 3, LOADER2 1":
    [1, 6, 1, 3, 1].every((value, index) => entry(BUDGETS[index], SUPPLIER) === String(value)),
  "CONSTRAINT_FLOORS is [2, 6, 0]": entry("CONSTRAINT_FLOORS", SUPPLIER) === "[2, 6, 0]",
  "form: local Field with errorId, 6 errorId, 6 aria-invalid, controlClassName 1 + 6 uses":
    count(form, "function Field({") === 1 && count(form, "errorId=") === 6 && count(form, "aria-invalid=") === 6 && count(form, "controlClassName") === 7,
  "form: the confirm stays for batch 5": count(form, 'confirm({ title: t("unsavedChangesConfirm"), tone: "destructive" })') === 1,
  "test: lines 18-20 still pin aria-invalid, aria-describedby and role=alert":
    uiTest.includes('  assert.match(source, /aria-invalid=/)\n  assert.match(source, /aria-describedby=/)\n  assert.match(source, /role="alert"/)\n'),
}
let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task 8; report which.`)
  process.exit(1)
}
console.log("Task 8 preconditions hold")
```

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/master-data/supplier-form.tsx tests/supplier-form-ui.test.ts tests/form-migration-guards.test.ts`, then `node <temp>/p2c2-precheck-8.mjs`
Expected:
- `git status` prints nothing.
- `git ls-files --eol` prints `i/lf w/crlf` for the form and its test, and `i/lf w/lf` for the guard file. Keep all three.
- The script prints 10 `ok` lines and `Task 8 preconditions hold`. On any `MISSING` line, stop and report it.

- [ ] **Step 2: Lower the supplier form's budgets (the failing guard)**

Run: `node <temp>/p2c-budget.mjs master-data/supplier-form.tsx LOCAL_FIELD=1:0 RAW_FIELDS=6:0 FIELD_CLASS_STRINGS=1:0 OLD_MARKUP=3:0 LOADER2=1:0`
Expected:
```
LOCAL_FIELD: 1 -> 0
RAW_FIELDS: 6 -> 0
FIELD_CLASS_STRINGS: 1 -> 0
OLD_MARKUP: 3 -> 0
LOADER2: 1 -> 0
MIGRATED_FILES: added master-data/supplier-form.tsx
```
On `ABORT`, stop and report the lines it prints.

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 18 · fail 5`. Five guards fail, each naming only `src/components/master-data/supplier-form.tsx`:
- GF1 `1 > 0`
- GF2 `6 > 0` (5 inputs, 1 textarea)
- GF3 `1 > 0` (`controlClassName`)
- GF7 `3 > 0` (the label span, the red star, the checkbox classes)
- GB1 `1 > 0`

Every other guard passes, including GF4 (code and name already have native `required`) and GF8.

- [ ] **Step 3: Write the failing tests in `tests/supplier-form-ui.test.ts`**

The file is CRLF and reads the form without stripping `\r`, so no regex here contains `\n`.

(1) Replace (spec §4.16, the test that pins `:18-20`):

```ts
test("supplier form presents associated inline errors", () => {
  assert.match(source, /parseSupplierFormError/)
  assert.match(source, /aria-invalid=/)
  assert.match(source, /aria-describedby=/)
  assert.match(source, /role="alert"/)
  assert.match(source, /fieldErrors/)
})
```

with:

```ts
test("supplier form presents associated inline errors", () => {
  assert.match(source, /parseSupplierFormError/)
  // The shared Field ties each error to its control: aria-invalid, aria-describedby and role="alert" (FieldError,
  // pinned in field-primitives.test.ts). Field id="supplier-<field>" keeps the old error ids: Field names the error `${id}-error`.
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  for (const id of ["code", "name", "contact", "phone", "email", "address"]) {
    assert.match(source, new RegExp(`<Field label=\\{t\\("\\w+"\\)\\} id="supplier-${id}"`), `supplier-${id}`)
  }
  assert.equal(source.match(/error=\{fieldErrors\.\w+ \? getErrorMessage\(fieldErrors\.\w+\) : undefined\}/g)?.length, 6)
  assert.doesNotMatch(source, /errorId=|function Field\(/)
  assert.doesNotMatch(source, /aria-invalid=|aria-describedby=/, "Field sets both; a hand-set pair would name the error twice")
  assert.match(source, /fieldErrors/)
})
```

(2) Append at the end of the file, after the last `})`:

```ts

test("supplier form uses the shared fields and a busy save button (2C batch 2)", () => {
  assert.doesNotMatch(source, /<textarea|<button|Loader2|controlClassName|ml-1 text-danger/)
  assert.equal(source.match(/<input\b/g)?.length, 1, "only the active checkbox stays a plain input")
  assert.match(source, /className=\{checkboxVariants\(\)\}/)
  assert.equal(source.match(/<Field label=/g)?.length, 6)
  assert.match(source, /<Link href=\{backHref\} onClick=\{confirmNavigation\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>/)
})
```

Run: `node --test tests/supplier-form-ui.test.ts`
Expected: FAIL, `tests 5 · pass 3 · fail 2`. "supplier form presents associated inline errors" fails first on `/import \{ Field \} from "@\/components\/ui\/field"/`, and the new test fails on its first `doesNotMatch` (`<textarea|<button|Loader2|controlClassName|ml-1 text-danger`).

- [ ] **Step 4: Migrate `src/components/master-data/supplier-form.tsx`**

Six exact replacements. Make all six before you compile: (1) imports the 2A `Field` and (6) deletes the local `Field` (§4.3 F8).

(1) Imports. `Loader2` goes; `ArrowLeft` stays for the header back link. No `NativeSelect`: the form has no select.

Replace:

```tsx
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import {
  parseSupplierFormError,
  type SupplierFormErrorCode,
  type SupplierFormErrors,
  type SupplierFormField,
} from "@/lib/supplier-form-errors"
import { useConfirm } from "@/components/ui/confirm-dialog"
```

with:

```tsx
import { ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"
import {
  parseSupplierFormError,
  type SupplierFormErrorCode,
  type SupplierFormErrors,
  type SupplierFormField,
} from "@/lib/supplier-form-errors"
import { Button, buttonVariants } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
```

(2) The class constant goes (F3).

Replace:

```tsx
const controlClassName = "min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"

export function SupplierForm({
```

with:

```tsx
export function SupplierForm({
```

(3) Code, name, contact person, phone, email and the active checkbox. `label=` stays the first prop, then `id`; each `error=` expression is unchanged. The `{tCommon("active")}` line and `</label>` after this block stay.

Replace:

```tsx
          <Field label={t("code")} required error={fieldErrors.code ? getErrorMessage(fieldErrors.code) : undefined} errorId="supplier-code-error">
            <input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.code)}
              aria-describedby={fieldErrors.code ? "supplier-code-error" : undefined}
              className={controlClassName}
            />
          </Field>

          <Field label={t("name")} required error={fieldErrors.name ? getErrorMessage(fieldErrors.name) : undefined} errorId="supplier-name-error">
            <input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
              autoComplete="organization"
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "supplier-name-error" : undefined}
              className={controlClassName}
            />
          </Field>

          <Field label={t("contactPerson")} error={fieldErrors.contactPerson ? getErrorMessage(fieldErrors.contactPerson) : undefined} errorId="supplier-contact-error">
            <input
              value={values.contactPerson ?? ""}
              onChange={(event) => setField("contactPerson", event.target.value)}
              maxLength={200}
              autoComplete="name"
              aria-invalid={Boolean(fieldErrors.contactPerson)}
              aria-describedby={fieldErrors.contactPerson ? "supplier-contact-error" : undefined}
              className={controlClassName}
            />
          </Field>

          <Field label={t("phone")} error={fieldErrors.phone ? getErrorMessage(fieldErrors.phone) : undefined} errorId="supplier-phone-error">
            <input
              type="tel"
              inputMode="tel"
              value={values.phone ?? ""}
              onChange={(event) => setField("phone", event.target.value)}
              maxLength={50}
              autoComplete="tel"
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? "supplier-phone-error" : undefined}
              className={controlClassName}
            />
          </Field>

          <Field label={t("email")} error={fieldErrors.email ? getErrorMessage(fieldErrors.email) : undefined} errorId="supplier-email-error">
            <input
              type="email"
              value={values.email ?? ""}
              onChange={(event) => setField("email", event.target.value)}
              maxLength={200}
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "supplier-email-error" : undefined}
              className={controlClassName}
            />
          </Field>

          <label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 text-sm md:self-end">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
            />
```

with:

```tsx
          <Field label={t("code")} id="supplier-code" required error={fieldErrors.code ? getErrorMessage(fieldErrors.code) : undefined}>
            <Input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
              autoComplete="off"
            />
          </Field>

          <Field label={t("name")} id="supplier-name" required error={fieldErrors.name ? getErrorMessage(fieldErrors.name) : undefined}>
            <Input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
              autoComplete="organization"
            />
          </Field>

          <Field label={t("contactPerson")} id="supplier-contact" error={fieldErrors.contactPerson ? getErrorMessage(fieldErrors.contactPerson) : undefined}>
            <Input
              value={values.contactPerson ?? ""}
              onChange={(event) => setField("contactPerson", event.target.value)}
              maxLength={200}
              autoComplete="name"
            />
          </Field>

          <Field label={t("phone")} id="supplier-phone" error={fieldErrors.phone ? getErrorMessage(fieldErrors.phone) : undefined}>
            <Input
              type="tel"
              inputMode="tel"
              value={values.phone ?? ""}
              onChange={(event) => setField("phone", event.target.value)}
              maxLength={50}
              autoComplete="tel"
            />
          </Field>

          <Field label={t("email")} id="supplier-email" error={fieldErrors.email ? getErrorMessage(fieldErrors.email) : undefined}>
            <Input
              type="email"
              value={values.email ?? ""}
              onChange={(event) => setField("email", event.target.value)}
              maxLength={200}
              autoComplete="email"
            />
          </Field>

          <label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 text-sm md:self-end">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
              className={checkboxVariants()}
            />
```

(4) Address. `min-h-28` stays (F2); `Textarea` brings `py-2`. The `<div className="md:col-span-2">` around it stays (F4).

Replace:

```tsx
            <Field label={t("address")} error={fieldErrors.address ? getErrorMessage(fieldErrors.address) : undefined} errorId="supplier-address-error">
              <textarea
                value={values.address ?? ""}
                onChange={(event) => setField("address", event.target.value)}
                maxLength={500}
                rows={4}
                autoComplete="street-address"
                aria-invalid={Boolean(fieldErrors.address)}
                aria-describedby={fieldErrors.address ? "supplier-address-error" : undefined}
                className={`${controlClassName} min-h-28 py-2`}
              />
            </Field>
```

with:

```tsx
            <Field label={t("address")} id="supplier-address" error={fieldErrors.address ? getErrorMessage(fieldErrors.address) : undefined}>
              <Textarea
                value={values.address ?? ""}
                onChange={(event) => setField("address", event.target.value)}
                maxLength={500}
                rows={4}
                autoComplete="street-address"
                className="min-h-28"
              />
            </Field>
```

(5) Cancel link (#151, keeps `onClick={confirmNavigation}`) and save button (#152). The F1 row around them keeps its classes.

Replace:

```tsx
          <Link
            href={backHref}
            onClick={confirmNavigation}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {tCommon("cancel")}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
            {tCommon("save")}
          </button>
```

with:

```tsx
          <Link href={backHref} onClick={confirmNavigation} className={buttonVariants({ variant: "outline" })}>
            {tCommon("cancel")}
          </Link>
          <Button type="submit" busy={saving}>
            <Save aria-hidden="true" />
            {tCommon("save")}
          </Button>
```

(6) The local `Field` goes, with its error `<span>`.

Replace:

```tsx
      </form>
    </div>
  )
}

function Field({
  label,
  required,
  error,
  errorId,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  errorId: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </span>
      {children}
      {error ? <span id={errorId} role="alert" className="mt-1.5 block text-xs font-medium text-danger">{error}</span> : null}
    </label>
  )
}
```

with:

```tsx
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Check the result**

Run: `grep -n "Loader2\|<input\|<select\|<textarea\|<button\|function Field\|controlClassName\|errorId\|aria-invalid\|aria-describedby\|disabled=" src/components/master-data/supplier-form.tsx`
Expected: one line only, the checkbox `<input`.

Run: `grep -c "min-h-11" src/components/master-data/supplier-form.tsx`
Expected: `2` (the header back link, which is 2B's, and the checkbox row).

Run: `git ls-files --eol src/components/master-data/supplier-form.tsx tests/supplier-form-ui.test.ts`
Expected: `i/lf w/crlf` for both, as before.

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `node --test tests/form-migration-guards.test.ts tests/supplier-form-ui.test.ts tests/supplier-form-errors.test.ts tests/master-data-return-navigation.test.ts tests/ui-overlay-guards.test.ts tests/visual-foundation-guards.test.ts tests/field-primitives.test.ts`
Expected: PASS, 0 fail. `tests/supplier-form-ui.test.ts` reports 5 tests; `tests/form-migration-guards.test.ts` 23.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 1 more test than after Task 7 (the appended test).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 3 files. `supplier-form.tsx` shows 24 insertions and 71 deletions, `tests/supplier-form-ui.test.ts` 18 insertions and 3 deletions, `tests/form-migration-guards.test.ts` 1 insertion and 5 deletions. A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 8: Check the guard state after batch 2**

Save this script as `p2c2-guard-state.mjs` in your temp folder (never in the repo):

```js
// Guard state after batch 2: run from the repo root. Prints every budget of tests/form-migration-guards.test.ts as
// "NAME: <entries> entries, <sum>" and fails if a master-data form still holds a budget (floors excepted). Never commit this file.
import { readFileSync } from "node:fs"

const guard = readFileSync("tests/form-migration-guards.test.ts", "utf8").replace(/\r\n/g, "\n")
const block = (name) => new RegExp(`^const ${name}\\b[\\s\\S]*?^[}\\]]`, "m").exec(guard)?.[0] ?? ""
const entries = (name) => [...block(name).matchAll(/^\s+\[`\$\{C\}([^`]+)`\]: (\[[^\]]*\]|\d+)/gm)].map((match) => ({ path: match[1], value: match[2] }))
const problems = []
for (const name of ["LOCAL_FIELD", "RAW_FIELDS", "FIELD_CLASS_STRINGS", "OLD_MARKUP", "LOADER2", "OLD_HELPERS", "REVERSE", "CLOSE_LABEL_IS_CANCEL", "FIXED_BOTTOM_BARS"]) {
  const list = entries(name)
  console.log(`${name}: ${list.length} entries, ${list.reduce((sum, item) => sum + Number(item.value), 0)}`)
  for (const item of list) if (item.path.startsWith("master-data/")) problems.push(`${name} still holds ${item.value} for ${item.path}`)
}
console.log(`CONSTRAINT_FLOORS: ${entries("CONSTRAINT_FLOORS").length} entries`)
const migrated = block("MIGRATED_FILES").match(/^\s+`\$\{C\}[^`]+`,/gm) ?? []
const masterData = migrated.filter((line) => line.includes("master-data/"))
console.log(`MIGRATED_FILES: ${migrated.length} (master-data ${masterData.length})`)
console.log(`PENDING_FOOTER_PARTS: ${(/^const PENDING_FOOTER_PARTS[\s\S]*?^\]\)/m.exec(guard)?.[0].match(/^\s+`\$\{C\}/gm) ?? []).length}`)
if (problems.length > 0) {
  console.error(problems.join("\n"))
  process.exit(1)
}
console.log("batch 2 holds no budget")
```

Run: `node <temp>/p2c2-guard-state.mjs`
Expected, exactly:
```
LOCAL_FIELD: 3 entries, 3
RAW_FIELDS: 19 entries, 48
FIELD_CLASS_STRINGS: 17 entries, 44
OLD_MARKUP: 13 entries, 38
LOADER2: 20 entries, 33
OLD_HELPERS: 1 entries, 1
REVERSE: 3 entries, 3
CLOSE_LABEL_IS_CANCEL: 1 entries, 1
FIXED_BOTTOM_BARS: 3 entries, 3
CONSTRAINT_FLOORS: 38 entries
MIGRATED_FILES: 34 (master-data 9)
PENDING_FOOTER_PARTS: 10
batch 2 holds no budget
```

This is the end state of batch 2. Against plan 2's start (HEAD `4daf0b9`):
- `LOCAL_FIELD` 10 entries (10) → 3 (3): `audit/audit-round-form.tsx` (batch 3), `admin/admin-user-form.tsx` and `admin/role-permission-form.tsx` (batch 4)
- `RAW_FIELDS` 27 (94) → 19 (48) · `FIELD_CLASS_STRINGS` 25 (85) → 17 (44) · `OLD_MARKUP` 21 (63) → 13 (38) · `LOADER2` 28 (41) → 20 (33): every remaining entry belongs to batch 3 or 4
- `CONSTRAINT_FLOORS` 38 entries, unchanged (floors never drop; the 8 batch-2 floors stay as written)
- `MIGRATED_FILES` 26 → 34: the 26 batch-1 files, then the 8 batch-2 forms in task order (branch, brand, category, company, department, employee, location, supplier). `master-data 9` counts `asset-model-form.tsx` from plan 1.
- `PENDING_FOOTER_PARTS` 10, `OLD_HELPERS`, `REVERSE`, `CLOSE_LABEL_IS_CANCEL` and `FIXED_BOTTOM_BARS` unchanged: batch 2 has no dialog, sticky bar or old helper.

If any line differs, stop and report it (do not edit a budget to make it match).

- [ ] **Step 9: Commit**

```bash
git add src/components/master-data/supplier-form.tsx tests/supplier-form-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): supplier form on the shared fields, with its six errors in Field (2C batch 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing afterwards.

**For the plan's dev-app check (`/th/master-data/suppliers/new` and `/th/master-data/suppliers/<id>/edit`, at 375, 768 and 1440):**
- save with a code that already exists: the code field gets a red border and halo, "duplicate code" sits under it, and the toast still shows; typing in the field clears the error
- NVDA reads the error once when it appears and again from the field (`aria-describedby`); the error id is still `supplier-code-error`
- a bad email shows its message under the email field, and the active checkbox row beside it stays 44px tall
- desktop fields and buttons are 40px (were 44); phones 44px with 16px text
- with unsaved changes, Cancel and the header back link still ask before leaving; Save keeps focus and shows a spinner while saving

---

### Task 9: Verify, production build and dev-app check (controller runs this task, not an implementer)

**Files:**
- Create then delete: `.claude/launch.json` (temporary; never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2c-plan2/after/` (git-ignored)
- Modify: only files needed to fix problems found here. Each fix gets its own small commit, with a test where one is possible, through an implementer and the normal review.

**Interfaces:**
- Consumes: Tasks 1–8 committed; the Task 0 before images and edit ids.
- Produces: the after images and the findings report `.superpowers/sdd/<plan workspace>/task-9-findings.md`, which Task 10 turns into the "Dev-app check" bullets.

- [ ] **Step 1: Full verify.** Run `npm run verify` (lint, tests, build). Record the test count and the build page count for Task 11.

- [ ] **Step 2: Production server.**
  - Confirm the dev database first (Task 0 Step 3).
  - Create `.claude/launch.json` with `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "start", "-p", "3001"]`, `port: 3001`, `autoPort: false`, and start it with `preview_start`.
  - Log in with the seed admin; do not echo the password.

- [ ] **Step 3: Screens.**
  - Take every Task 0 view at the same widths and save each under the same name in `after/`. Compare each with its before image: height change, wrapping, truncation, any lost color or shape.
  - Then check, in Thai, at 1440, 768, 700 and 375:
    - All 16 pages: fields are white with the 3:1 border, 40px on desktop and at least 44px with 16px text on phones. Labels use the Meta style, required fields show the star, hints sit under their field. No page mixes old and new fields. The bottom navigation stays hidden (K15).
    - The checkbox rows on each form: clicking the label text toggles the box. At 375 the supplier "active" row and the category "required field" rows are at least 44px tall; the other "active" rows keep their ~38px height (spec §4.12, ruling 14 of §4).
    - Category edit: the photo checklist's up, down, duplicate and remove buttons are named, reachable with Tab, and grey (not faded) when disabled at the ends of the list. The custom field template rows keep their layout.
    - Employee and supplier: the two-column grids at 768 and 700 do not cut long Thai labels.
  - One English pass at 1440 on `supplier-new` and `category-edit`.
  - 200% zoom at 1440 on `supplier-new`.

- [ ] **Step 4: Saves that write nothing.**
  - **Supplier duplicate code (Review Focus 2 and 3):**
    - On `/th/master-data/suppliers/new`, fill the required fields and type the code of an existing supplier.
    - Slow the network first, through Playwright's CDP session: `Network.emulateNetworkConditions` with `latency: 1500`.
    - Press Enter in the code field, then Enter again at once.
    - Expected:
      - one save request only
      - the Save button stays focused, shows its spinner and keeps its label
      - the code field then shows the duplicate-code error under it, with `aria-invalid="true"` and `aria-describedby` naming the error's id
      - the error is announced (`role="alert"`)
      - the supplier list has no new row
    - Turn the throttle off afterwards.
  - **Branch code of spaces:** save a new branch with code `"   "`. Expected: a Thai toast "ข้อมูลที่กรอกไม่ครบหรือไม่ถูกต้อง…" with no JSON, and no new branch.
  - **Return navigation (Review Focus 5):** open `/th/master-data/branches` with a search, open New, then press Cancel. Expected: back on the same filtered list.
  - Save nothing else. A busy-save check on a valid save would write data, so it stays with the user.

- [ ] **Step 5: Keyboard.**
  - Tab order on every form follows the visual order, and Cancel comes before Save.
  - Space toggles the "active" checkbox. Enter on the checkbox behaves as before the migration (compare with the before build only if a task changed it).
  - The focus ring shows on every field, checkbox and button.
  - An empty `required` field still shows the browser warning on Save (Review Focus 1). Try it on branch, employee and supplier.

- [ ] **Step 6: axe.** Inject `node_modules/axe-core/axe.min.js` with `page.addScriptTag({ path })` and run `axe.run({ runOnly: ["color-contrast", "label", "aria-valid-attr-value", "aria-required-attr", "button-name", "nested-interactive"] })` on the 8 new pages and on `supplier-new` with the duplicate-code error showing. Expected: 0 violations.

- [ ] **Step 7: Forced colors and reduced motion.** Use Playwright `emulateMedia` (`forcedColors: "active"`, then `reducedMotion: "reduce"`). Check that the checkbox, its focus ring and the field borders stay visible, and that the button spinner stops.

- [ ] **Step 8: NVDA and real devices.** If NVDA is not available to you, list these checks for the user and do not mark them done:
  - required fields read "จำเป็น" and the star is not read
  - the supplier errors read at once
  - the photo checklist's icon buttons read their names
  - on an iPhone (Safari), the form fields do not zoom and the "active" row is easy to tap
  - on an iPad (768), 14px fields do not zoom

  Add them to the pending manual checks from phase 1, 2A and 2C plan 1. All of them must be done before the user approves the one phase-2 deploy.

- [ ] **Step 9: Findings report.** Write `task-9-findings.md` in the plan workspace in the same shape as plan 1's Task 21 findings:
  - fixes made (commit + one line each, or "none")
  - what was checked and passed
  - what was found but not caused by plan 2
  - accepted mixes
  - what still needs a person

- [ ] **Step 10: Clean up.**
  - Stop the server and delete `.claude/launch.json`.
  - Run `git status --short`; it must show no stray files.

---

### Task 10: Design documentation for plan 2 (repo docs only; the controller adds the verify numbers and the wiki in Task 11)

Plan 2 adds no primitive and no rule, so the design docs change only where they count what is left. The handoff and the changelog get a plan 2 entry. All four files are CRLF in the working tree (`i/lf w/crlf`): edit them with exact-string replacement, keep the endings, and never run a formatter. Match on the quoted strings, not on line numbers.

Rulings made in this task:
- **No DESIGN.md frontmatter, no `.impeccable/design.json`:** no component or token changed, so the sidecar stays as plan 1 left it.
- **The deploy decision of 2026-10-12** goes into both the handoff and the changelog: one deploy after all of phase 2, not one per batch. The plan 1 entries keep their text and gain one pointer sentence each, so their history still reads as it was written.
- **The changelog gets a new `## 2026-10-12` heading** above `## 2026-10-11`, with the `---` separator the file uses between dates.
- **The "Dev-app check (Task 9)" bullets** come from `.superpowers/sdd/<plan workspace>/task-9-findings.md`, in the shape of plan 1's bullets: what was checked, the results, fixes, and what still needs a person.

**Files:**
- Modify: `DESIGN.md` (CRLF): §3 Label (line 288), §5 Inputs "Migration" (line 459)
- Modify: `docs/14_UI_UX_DESIGN_SYSTEM.md` (CRLF): the "Forms and dialogs" registry row (line 102)
- Modify: `DEVELOPER_HANDOFF.md` (CRLF): a new section before `## Open Go-Live Decisions` (line 449), and one sentence in the plan 1 section's **Deploy** bullet (line 357)
- Modify: `docs/99_CHANGELOG.md` (CRLF): a new `## 2026-10-12` block above `## 2026-10-11` (line 7), and one sentence in the plan 1 entry's **deploy** bullet (line 30)
- Temp folder only, never committed: `check-docs-2c2.mjs`
- Not in this task: the verify numbers (Task 11 adds them), the wiki (Task 11), `docs/07_UAT_CHECKLIST.md`

**Interfaces:**
- Consumes: Tasks 1–9 committed; `task-9-findings.md`.
- Produces: the plan 2 handoff section with a "Dev-app check (Task 9)" bullet, and the changelog entry with a "ตรวจบนแอป (Task 9)" bullet. Task 11 adds its verification bullet directly above each of them.

- [ ] **Step 1: Check the base.**

Run: `git diff --quiet 4daf0b9 HEAD -- DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md && echo DOCS-UNCHANGED`
Expected: `DOCS-UNCHANGED` (Tasks 1–9 did not touch them).

Run: `git ls-files --eol DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md`
Expected: `i/lf    w/crlf` for all four.

Run: `ls docs/superpowers/plans/2026-10-12-ui-phase2c-plan2.md`
Expected: the file exists (the docs link it).

- [ ] **Step 2: Write the check script (it fails first).** Save as `check-docs-2c2.mjs` in your temp folder:

```js
// check-docs-2c2.mjs: run from the repo root. Checks the plan 2 docs edits of Task 10. Never commit this file.
import { readFileSync } from "node:fs"

const files = ["DESIGN.md", "docs/14_UI_UX_DESIGN_SYSTEM.md", "DEVELOPER_HANDOFF.md", "docs/99_CHANGELOG.md"]
const raw = Object.fromEntries(files.map((path) => [path, readFileSync(path, "utf8")]))
const text = Object.fromEntries(files.map((path) => [path, raw[path].replace(/\r\n/g, "\n")]))
const count = (path, literal) => text[path].split(literal).length - 1
const checks = {
  "every file is CRLF only": files.every((path) => !/(^|[^\r])\n/.test(raw[path])),
  "DESIGN.md: labels of batches 3–5 in plans 3–5": count("DESIGN.md", "the hand-written labels of the 2C batch 3–5 forms move to it in plans 3–5") === 1 && count("DESIGN.md", "batch 2–5 forms") === 0,
  "DESIGN.md: plan 2 migration line": count("DESIGN.md", "Phase 2C plan 2 moved the 46 fields of the 8 master-data forms (batch 2) the same way.") === 1 && count("DESIGN.md", "The 48 hand-written fields in the other 32 files of 2C move in plans 3–5") === 1 && count("DESIGN.md", "The 94 hand-written fields") === 0,
  "docs/14: plan 2 linked": count("docs/14_UI_UX_DESIGN_SYSTEM.md", "[`2026-10-12-ui-phase2c-plan2.md`](superpowers/plans/2026-10-12-ui-phase2c-plan2.md) sequences plan 2 (batch 2, the master-data forms); plans 3–5 follow") === 1,
  "handoff: plan 2 section before Open Go-Live Decisions": (() => {
    const at = text["DEVELOPER_HANDOFF.md"].indexOf("## UI Round 4 Phase 2C Plan 2 Master-Data Forms (2026-10-12)")
    return at > 0 && at < text["DEVELOPER_HANDOFF.md"].indexOf("## Open Go-Live Decisions") && count("DEVELOPER_HANDOFF.md", "- Dev-app check (Task 9):") === 1
  })(),
  "handoff: plan 1 deploy points to the 2026-10-12 decision": count("DEVELOPER_HANDOFF.md", "On 2026-10-12 the user moved this deploy to the end of phase 2; see the plan 2 section.") === 1,
  "changelog: 2026-10-12 block on top": (() => {
    const changelog = text["docs/99_CHANGELOG.md"]
    const top = changelog.indexOf("## 2026-10-12")
    return top > 0 && top < changelog.indexOf("## 2026-10-11") && changelog.includes("### ฟอร์มข้อมูลหลัก (UI รอบ 4 เฟส 2C plan 2)") && /## 2026-10-12\n\n[\s\S]*?\n\n---\n\n## 2026-10-11/.test(changelog) && count("docs/99_CHANGELOG.md", "- **ตรวจบนแอป (Task 9):**") === 1
  })(),
  "changelog: plan 1 deploy points to the 2026-10-12 decision": count("docs/99_CHANGELOG.md", "(2026-10-12: ผู้ใช้เลื่อน deploy นี้ไปรวมครั้งเดียวตอนจบเฟส 2 ดู plan 2)") === 1,
}
let failed = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`)
  if (!ok) failed += 1
}
process.exit(failed ? 1 : 0)
```

- [ ] **Step 3: Run it.**

Run: `node <temp>/check-docs-2c2.mjs`
Expected: exit 1. `ok` on "every file is CRLF only", `FAIL` on the other seven lines.

- [ ] **Step 4: DESIGN.md (two replacements).**

(1) §3 Label. Replace:

```
the hand-written labels of the 2C batch 2–5 forms move to it in plans 2–5.
```

with:

```
the hand-written labels of the 2C batch 3–5 forms move to it in plans 3–5.
```

(2) §5 Inputs, "Migration". Replace:

```
These include the 16 forms that showed both kinds after 2A, so no form mixes them any more. The 94 hand-written fields in the other 40 files of 2C move in plans 2–5, and 3 stay on purpose:
```

with:

```
These include the 16 forms that showed both kinds after 2A, so no form mixes them any more. Phase 2C plan 2 moved the 46 fields of the 8 master-data forms (batch 2) the same way. The 48 hand-written fields in the other 32 files of 2C move in plans 3–5, and 3 stay on purpose:
```

- [ ] **Step 5: `docs/14_UI_UX_DESIGN_SYSTEM.md` (one replacement).** Replace:

```
sequences plan 1 (P0, the 2C-0 primitives, the ZodError fix and batch 1); plans 2–5 follow, one per batch. |
```

with:

```
sequences plan 1 (P0, the 2C-0 primitives, the ZodError fix and batch 1); [`2026-10-12-ui-phase2c-plan2.md`](superpowers/plans/2026-10-12-ui-phase2c-plan2.md) sequences plan 2 (batch 2, the master-data forms); plans 3–5 follow, one per batch. |
```

- [ ] **Step 6: `DEVELOPER_HANDOFF.md` (two replacements).**

(1) The plan 1 **Deploy** bullet. Replace:

```
as one deploy that the user starts after the dev-app check and the manual checks below.
```

with:

```
as one deploy that the user starts after the dev-app check and the manual checks below. On 2026-10-12 the user moved this deploy to the end of phase 2; see the plan 2 section.
```

(2) The new section. Replace the line `## Open Go-Live Decisions` with the block below, which ends with that same line. Write the "Dev-app check (Task 9)" bullet and the "Still open" list from `task-9-findings.md`, in the shape of the plan 1 section's bullets.

```
## UI Round 4 Phase 2C Plan 2 Master-Data Forms (2026-10-12)

- Branch `feat/ui-phase2c-plan2` (from `master` `4daf0b9`: 2A and 2C plan 1 merged and pushed, not deployed). Spec `docs/superpowers/specs/2026-10-11-ui-phase2c-design.md` §8.9 batch 2 (its §10 rulings override the section files) · plan `docs/superpowers/plans/2026-10-12-ui-phase2c-plan2.md` · canonical values in `DESIGN.md`.
  - Batch 2 is the 8 master-data forms: branch, brand, category, company, department, employee, location and supplier (46 fields, 9 checkboxes, 26 buttons). One commit per form.
  - No new primitive, rule, message key, workflow, page, schema, RBAC, migration, dependency or token. No server change.
- **Deploy:** on 2026-10-12 the user decided to deploy once, after all of phase 2 is done (2C plans 2–5, 2B, 2D and the V track), instead of once per batch as spec §8.9 planned. Until then `master` holds 2A, 2C plan 1 and this plan undeployed, and `ab1b873` stays the rollback point (no schema change).
- **What changed in each form** (`src/components/master-data/`):
  - Every field is the shared `Field` with `Input`, `NativeSelect` or `Textarea`. Each form's local `Field` helper is gone. `required`, `maxLength`, `type`, `inputMode` and `autoComplete` stay on the controls (K4), and textareas resize vertically (`resize-y` from `Textarea`).
  - The "active" checkbox (and the category "required field" checkbox) use `checkboxVariants()`. The category "required field" row and the supplier "active" row are 44px tap targets (`min-h-11`).
  - Save is a `Button` with `busy={saving}`: the spinner replaces the save icon, the label stays, and focus stays on the button. The branch and location forms still keep Save disabled while there is no company or no branch to choose. Cancel is a link styled `buttonVariants({ variant: "outline" })`; the supplier Cancel still asks before dropping unsaved changes.
  - Category template editors: the add, move and duplicate buttons are `outline` `md`, remove custom field is `danger` `md`, and the 4 photo-item buttons are `outline` `icon` with a neutral remove icon (K22). The photo-row grid sizes its icon columns to the button (`repeat(4,auto)`), and each photo item field has a hidden label.
  - Company: the help lines under the code and asset tag code fields are `Field hint=`, so screen readers read each with its field.
  - Supplier: the 6 errors under fields come from `Field error=` with `id="supplier-<field>"`, so the error ids stay `supplier-<field>-error`. `Field` sets `aria-invalid` and `aria-describedby`, and `FieldError` has `role="alert"`.
  - The header back links stay as they were (2B, O16), as do the form panels (K28, 2D) and the footer rows.
- **Tests:**
  - New: `tests/branch-form-ui.test.ts`, `brand-form-ui`, `category-form-ui`, `company-form-ui`, `department-form-ui`, `employee-form-ui` and `location-form-ui`.
  - `tests/supplier-form-ui.test.ts`: the inline-error test now checks the 6 `Field error=` sites and the 6 field ids (spec §4.16), and one test pins the busy save and the outline cancel.
  - `tests/form-migration-guards.test.ts`: the 8 forms are in `MIGRATED_FILES` (34 files), their budgets are gone, and `CONSTRAINT_FLOORS` is unchanged.
- Dev-app check (Task 9): <from task-9-findings.md>
- Before/after screenshots: `.superpowers/sdd/screenshots/ui-phase2c-plan2/before/` and `after/` (git-ignored, on the development machine only).
- Still open, for a person before the one phase-2 deploy: <from task-9-findings.md>, together with the open checks of phase 1, 2A and 2C plan 1 above.
- Next: 2B (list pages and page frames, its own spec and plans), then 2C plans 3–5 after 2B merges, 2D and the V track.

## Open Go-Live Decisions
```

Replace both `<from task-9-findings.md>` markers with the text from the findings; no marker may stay.

- [ ] **Step 7: `docs/99_CHANGELOG.md` (two replacements).**

(1) The plan 1 entry's **deploy** bullet. Replace:

```
หลังผู้ใช้ตรวจเครื่องจริงและอนุมัติ · ถอยกลับไป `ab1b873` ได้เพราะไม่มี schema เปลี่ยน
```

with:

```
หลังผู้ใช้ตรวจเครื่องจริงและอนุมัติ · ถอยกลับไป `ab1b873` ได้เพราะไม่มี schema เปลี่ยน (2026-10-12: ผู้ใช้เลื่อน deploy นี้ไปรวมครั้งเดียวตอนจบเฟส 2 ดู plan 2)
```

(2) The new date block. Replace the line `## 2026-10-11` (the first one, line 7) with the block below, which ends with that same line. Write the "ตรวจบนแอป (Task 9)" bullet from `task-9-findings.md`, in Thai, in the shape of the plan 1 entry's bullet.

```
## 2026-10-12

### ฟอร์มข้อมูลหลัก (UI รอบ 4 เฟส 2C plan 2)

Branch `feat/ui-phase2c-plan2` (จาก `master` `4daf0b9`) · design `docs/superpowers/specs/2026-10-11-ui-phase2c-design.md` ข้อ 8.9 ชุด 2 · plan `docs/superpowers/plans/2026-10-12-ui-phase2c-plan2.md` · ค่าทั้งหมดอยู่ใน `DESIGN.md`

- **ขอบเขต:** ฟอร์มข้อมูลหลัก 8 ฟอร์ม (สาขา ยี่ห้อ หมวดหมู่ บริษัท แผนก พนักงาน สถานที่ ผู้ขาย · 46 ช่อง) ย้ายไปใช้ช่องกรอกและปุ่มกลางของ 2A · ไม่มีของกลางใหม่ ไม่เปลี่ยนขั้นตอนงาน ไม่แตะฐานข้อมูล ไม่แก้ server ไม่เพิ่ม key ข้อความ ไม่เพิ่ม token
- **ช่องกรอก:** ทุกช่องเป็น `Field` กับ `Input` / `NativeSelect` / `Textarea` · คง `required` / `maxLength` และ toast เดิมทุกจุด (การตรวจกรอกไม่เปลี่ยน) · จอใหญ่สูง 40 มือถือสูงอย่างน้อย 44 ตัวอักษร 16px · ช่องข้อความยาวยืดลงได้ · คำอธิบายใต้รหัสบริษัทและรหัสป้ายเป็น hint ของช่อง โปรแกรมอ่านหน้าจออ่านพร้อมช่อง
- **ฟอร์มผู้ขาย:** error ใต้ช่องทั้ง 6 ช่องมาจาก `Field error=` · id ของ error เหมือนเดิม · โปรแกรมอ่านหน้าจออ่าน error ทันที · ออกจากหน้าตอนยังไม่บันทึกยังถามก่อน
- **ปุ่ม:** บันทึกเป็น `Button` แบบ `busy` (ไอคอนหมุนแทนไอคอนบันทึก ป้ายไม่เปลี่ยน โฟกัสไม่หลุด) · สาขาและสถานที่ยังกดบันทึกไม่ได้ถ้าไม่มีบริษัทหรือสาขาให้เลือก · ยกเลิกเป็นลิงก์แบบปุ่ม `outline` · หมวดหมู่: ปุ่มเพิ่ม เลื่อน และคัดลอกเป็น `outline` ปุ่มลบช่องเพิ่มเติมเป็น `danger` ปุ่มไอคอนของรายการรูปเป็น `outline` และปุ่มลบรายการรูปไม่เป็นสีแดง (K22)
- **checkbox:** "ใช้งาน" และ "จำเป็น" ใช้ `checkboxVariants()` · แถว "จำเป็น" ของหมวดหมู่และแถว "ใช้งาน" ของผู้ขายกดได้สูง 44px
- **test:** ใหม่ 7 ไฟล์ (`branch-form-ui`, `brand-form-ui`, `category-form-ui`, `company-form-ui`, `department-form-ui`, `employee-form-ui`, `location-form-ui`) · แก้ `supplier-form-ui` ตามสเปกข้อ 4.16 · guard `form-migration-guards`: 8 ฟอร์มอยู่ใน `MIGRATED_FILES` แล้ว budget ของ 8 ไฟล์เป็น 0
- **deploy:** 2026-10-12 ผู้ใช้ตัดสินให้ deploy ครั้งเดียวหลังเฟส 2 เสร็จทั้งหมด (2C plan 2–5 · 2B · 2D · งาน V) แทน deploy ทีละชุด · ถอยกลับไป `ab1b873` ได้เพราะไม่มี schema เปลี่ยน
- **ตรวจบนแอป (Task 9):** <จาก task-9-findings.md>
- ภาพก่อน/หลัง: `.superpowers/sdd/screenshots/ui-phase2c-plan2/before/` และ `after/` (git ignore อยู่บนเครื่องพัฒนา)
- เลื่อนไว้: 2B (หน้ารายการและโครงหน้า) · plan 3–5 หลัง 2B merge · 2D · งาน V

---

## 2026-10-11
```

Replace the `<จาก task-9-findings.md>` marker with the text from the findings; no marker may stay.

- [ ] **Step 8: Check.**

Run: `node <temp>/check-docs-2c2.mjs`
Expected: 8 `ok` lines, exit 0.

Run: `grep -n "<from task-9\|<จาก task-9" DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md`
Expected: nothing.

Run: `git diff --stat`
Expected: exactly the four files. `DESIGN.md` 2 lines changed, `docs/14_UI_UX_DESIGN_SYSTEM.md` 1 line. A file that shows every line changed was normalized: restore its line endings.

Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: all green (`tests/audit-round-cancellation.test.ts` reads the handoff and the changelog).

- [ ] **Step 9: Commit.**

```bash
git add DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md
git commit -m "docs(ui): phase 2C plan 2 master-data forms in DESIGN.md, handoff and changelog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit. `git status --short` prints only the untracked paths in Global Constraints.

---

### Task 11: Final verification, wiki and memory (controller runs this task)

**Files:**
- Modify: `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md` (verify numbers)
- Modify (vault `D:\Obsidian\Eltross`): `AssetSystem/ams-status.md`, `AssetSystem/ams-log.md`, `AssetSystem/ams-open-questions.md`
- Modify (auto-memory): `review-2026-10-priorities.md`

**Interfaces:**
- Consumes: Tasks 1–10 committed.
- Produces: the branch ready for superpowers:finishing-a-development-branch.

- [ ] **Step 1: Verify.**
  - Run `npm run verify` and record the test count and the build page count.
  - If it passed, add one bullet to the plan 2 entry in `docs/99_CHANGELOG.md`, directly above its "ตรวจบนแอป (Task 9)" bullet, in the existing style: `` `npm run verify` ผ่าน (test N · ผ่าน N · ข้าม 1 · build X/X หน้า) ``.
  - Add the same numbers to the plan 2 section of `DEVELOPER_HANDOFF.md`, directly above its "Dev-app check (Task 9)" bullet: `Verification: `npm run verify` passes (tests N · pass N · skipped 1 · build X/X pages).`
  - Run `npm test` again (`tests/audit-round-cancellation.test.ts` reads both files).
  - Commit both files with `docs(ui): record phase 2C plan 2 verify results` and the Co-Authored-By line.

- [ ] **Step 2: Wiki.** Read `AssetSystem/_schema/ams-wiki-schema.md` first, then:
  - `ams-status.md`: in the 2C row, add plan 2: built on `feat/ui-phase2c-plan2`, the verify numbers, not merged, not deployed. Replace "deploy ครั้งเดียวพร้อม 2A …" with the 2026-10-12 decision: one deploy after all of phase 2 (2C plans 2–5, 2B, 2D, V track).
  - `ams-log.md`: add an entry at the top of `## <today>`.
  - `ams-open-questions.md`:
    - add the plan 2 manual checks from Task 9 Step 8 to the 2C item (26)
    - change item 27 (the combined deploy) to the 2026-10-12 decision: everything of phase 2 deploys once, after the user's manual checks
  - Run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` from `D:\Obsidian\Eltross`.
  - Commit only those three files with an `ingest:` message. Other sessions have uncommitted changes in the vault; never stage them.

- [ ] **Step 3: Memory.** Update `review-2026-10-priorities.md` in the auto-memory folder: 2C plan 2 is built on `feat/ui-phase2c-plan2`, not merged, not deployed. Note what comes next: 2B (spec and plans), then 2C plans 3–5 after 2B merges, 2D, and the V track; one deploy at the end of phase 2.

- [ ] **Step 4:** Use superpowers:finishing-a-development-branch.
